import { useEffect, useReducer, useRef, useState } from "react";
import { Exhibit } from "../components/Exhibit";

type Breaker = "CLOSED" | "OPEN" | "HALF-OPEN";
type Evt = { id: number; attempt: number };
type LogLine = { id: number; text: string; tone?: "ok" | "warn" | "err" };

const FAIL_THRESHOLD = 3;
const BREAKER_COOLDOWN = 4000;
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Simulator() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [log, setLog] = useState<LogLine[]>([
    { id: 0, text: "simulator ready — send an event to begin" },
  ]);
  const logRef = useRef<HTMLDivElement>(null);
  const logId = useRef(0);

  // Mutable engine state lives outside React's render cycle; force() publishes snapshots.
  const S = useRef({
    clientUp: true,
    delivered: 0,
    retries: 0,
    dlq: 0,
    breaker: "CLOSED" as Breaker,
    fails: 0,
    inFlight: false,
    seq: 0,
    queue: [] as Evt[],
    breakerTimer: 0 as ReturnType<typeof setTimeout> | 0,
  }).current;

  useEffect(() => {
    return () => { if (S.breakerTimer) clearTimeout(S.breakerTimer); };
  }, [S]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const slog = (text: string, tone?: LogLine["tone"]) =>
    setLog((xs) => [...xs.slice(-59), { id: ++logId.current, text, tone }]);

  const nodeRefs = {
    producer: useRef<HTMLDivElement>(null),
    bus: useRef<HTMLDivElement>(null),
    queue: useRef<HTMLDivElement>(null),
    client: useRef<HTMLDivElement>(null),
  };
  const wireRefs = {
    w1: useRef<HTMLDivElement>(null),
    w2: useRef<HTMLDivElement>(null),
    w3: useRef<HTMLDivElement>(null),
  };

  function zap(ref: React.RefObject<HTMLDivElement | null>) {
    const n = ref.current;
    if (!n) return;
    n.classList.add("zap");
    setTimeout(() => n.classList.remove("zap"), 320);
  }

  function packet(ref: React.RefObject<HTMLDivElement | null>, fail: boolean, dur = 380) {
    const w = ref.current;
    if (!w) return;
    const p = document.createElement("div");
    p.className = "sim-packet" + (fail ? " fail" : "");
    w.appendChild(p);
    p.animate([{ left: "0%" }, { left: "calc(100% - 12px)" }], {
      duration: dur,
      easing: "linear",
      fill: "forwards",
    });
    setTimeout(() => p.remove(), dur + 60);
  }

  function tripBreaker() {
    if (S.breaker === "OPEN") return;
    S.breaker = "OPEN";
    slog(`breaker OPEN after ${FAIL_THRESHOLD} consecutive failures — fast-failing to spare the client`, "err");
    if (S.breakerTimer) clearTimeout(S.breakerTimer);
    S.breakerTimer = setTimeout(() => {
      S.breaker = "HALF-OPEN";
      slog("breaker HALF-OPEN — letting one probe request through", "warn");
      force();
      pump();
    }, BREAKER_COOLDOWN);
    force();
  }

  async function attemptDelivery(evt: Evt) {
    packet(wireRefs.w3, !S.clientUp, 420);
    await sleep(420);
    zap(nodeRefs.client);

    if (S.clientUp) {
      S.delivered++;
      S.fails = 0;
      if (S.breaker === "HALF-OPEN") {
        S.breaker = "CLOSED";
        slog("probe succeeded — breaker CLOSED, resuming normal delivery", "ok");
      }
      slog(`event #${evt.id} delivered (attempt ${evt.attempt}) — 200 OK, signature verified`, "ok");
      force();
      return;
    }

    S.fails++;
    if (S.breaker === "HALF-OPEN") {
      slog(`probe event #${evt.id} failed — breaker back to OPEN`, "err");
      S.breaker = "CLOSED";
      tripBreaker();
    } else {
      slog(`event #${evt.id} attempt ${evt.attempt} failed — client unreachable`, "err");
      if (S.fails >= FAIL_THRESHOLD) tripBreaker();
    }

    if (evt.attempt >= MAX_ATTEMPTS) {
      S.dlq++;
      slog(`event #${evt.id} exhausted ${MAX_ATTEMPTS} attempts — parked in the dead-letter queue`, "err");
      force();
      return;
    }

    const backoff = 500 * Math.pow(2, evt.attempt - 1);
    S.retries++;
    evt.attempt++;
    slog(`event #${evt.id} retrying in ${backoff}ms — exponential backoff, attempt ${evt.attempt}/${MAX_ATTEMPTS}`, "warn");
    force();
    setTimeout(() => { S.queue.push(evt); pump(); }, backoff);
  }

  async function pump() {
    if (S.inFlight || S.breaker === "OPEN") return;
    const evt = S.queue.shift();
    if (!evt) return;
    S.inFlight = true;
    force();
    await attemptDelivery(evt);
    S.inFlight = false;
    force();
    if (S.breaker === "HALF-OPEN" && S.queue.length) return;
    pump();
  }

  async function fireEvent() {
    const evt: Evt = { id: ++S.seq, attempt: 1 };
    zap(nodeRefs.producer);
    packet(wireRefs.w1, false, 300);
    await sleep(300);
    zap(nodeRefs.bus);
    slog(`event #${evt.id} published — payload signed, correlation-id attached`);
    packet(wireRefs.w2, false, 300);
    await sleep(300);
    zap(nodeRefs.queue);
    S.queue.push(evt);
    force();
    pump();
  }

  async function burst() {
    for (let i = 0; i < 10; i++) {
      fireEvent();
      await sleep(150);
    }
  }

  function toggleClient() {
    S.clientUp = !S.clientUp;
    slog(
      S.clientUp ? "client recovered" : "client taken down — watch the failure handling",
      S.clientUp ? "ok" : "err"
    );
    force();
    if (S.clientUp) pump();
  }

  function replayDlq() {
    if (!S.dlq) return;
    const n = S.dlq;
    S.dlq = 0;
    slog(`replaying ${n} event(s) from the DLQ — idempotency keys prevent double-delivery`, "warn");
    for (let i = 0; i < n; i++) S.queue.push({ id: ++S.seq, attempt: 1 });
    force();
    pump();
  }

  return (
    <Exhibit
      id="event-hub"
      no="01"
      title="The Event Hub"
      story={
        <>
          The delivery backbone I designed for a travel platform's external APIs moves{" "}
          <strong>~1M events a day</strong> to third-party clients — signed payloads, circuit
          breakers, backoff, dead-letter queue. This is the working scale model.{" "}
          <strong>Take the client down mid-burst. That's the fun part.</strong>
        </>
      }
      footnote="in production since 2025 on AWS EventBridge + BullMQ/Redis — HMAC signing, per-subscription breakers, rate limits, Postgres-backed DLQ. Employer's name lives in the CV."
    >
      <div className="sim card">
        <div className="sim-controls">
          <button className="btn btn-accent" onClick={fireEvent}>Send event</button>
          <button className="btn" onClick={burst}>Burst ×10</button>
          <button className="btn" onClick={toggleClient}>
            {S.clientUp ? "😇 Client: healthy — sabotage it" : "🔥 Client: down — revive it"}
          </button>
          <button className="btn" onClick={replayDlq} disabled={S.dlq === 0}>
            Replay DLQ {S.dlq > 0 ? `(${S.dlq})` : ""}
          </button>
        </div>

        <div className="sim-stage" aria-hidden="true">
          <div className="sim-node" ref={nodeRefs.producer}><span className="tag">API</span>Producer</div>
          <div className="sim-wire" ref={wireRefs.w1} />
          <div className="sim-node" ref={nodeRefs.bus}><span className="tag">BUS</span>Event bus</div>
          <div className="sim-wire" ref={wireRefs.w2} />
          <div className="sim-node" ref={nodeRefs.queue}>
            <span className="tag">QUEUE</span>Delivery queue
            <span className="sim-badge">{S.queue.length}</span>
          </div>
          <div className="sim-wire" ref={wireRefs.w3}>
            <div className={"sim-breaker" + (S.breaker === "OPEN" ? " open" : S.breaker === "HALF-OPEN" ? " half" : "")}>
              {S.breaker}
            </div>
          </div>
          <div className={"sim-node" + (S.clientUp ? "" : " dead")} ref={nodeRefs.client}>
            <span className="tag">{S.clientUp ? "HTTPS" : "503"}</span>Client endpoint
          </div>
        </div>

        <div className="sim-readout">
          <span><b>{S.delivered}</b> delivered</span>
          <span><b>{S.retries}</b> retries</span>
          <span className="bad"><b>{S.dlq}</b> in DLQ</span>
          <span>breaker <b>{S.breaker}</b></span>
        </div>

        <div className="sim-log" ref={logRef} aria-live="polite">
          {log.map((l) => (
            <div key={l.id} className={l.tone}>{l.text}</div>
          ))}
        </div>
      </div>

    </Exhibit>
  );
}
