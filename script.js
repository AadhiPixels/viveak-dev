/* viveakv.dev — quiet game layer + webhook delivery simulator */
(() => {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ============ toasts (used sparingly) ============ */
  const toasts = document.getElementById("toasts");
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(() => el.classList.add("out"), 3600);
    setTimeout(() => el.remove(), 3950);
  }

  /* ============ quiet exploration game ============ */
  const SECTIONS = ["experience", "demo", "skills", "products", "work-together"];
  const seen = new Set();
  let playedSim = false;
  const chip = document.getElementById("exploreChip");
  const chipCount = document.getElementById("exploreCount");

  function updateChip() {
    chipCount.textContent = `${seen.size}/${SECTIONS.length}`;
    if (seen.size > 0) chip.classList.add("show");
    if (seen.size === SECTIONS.length) {
      chip.classList.add("done");
      chipCount.textContent = "5/5";
      maybeFinish();
    }
  }

  let finished = false;
  function maybeFinish() {
    if (finished || seen.size < SECTIONS.length || !playedSim) return;
    finished = true;
    toast("You've explored everything and broken my delivery system on purpose. We should probably talk — viveak.03@gmail.com");
  }

  /* section reveal + tracking */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in-view");
      if (SECTIONS.includes(e.target.id)) {
        if (!seen.has(e.target.id)) { seen.add(e.target.id); updateChip(); }
      }
    }
  }, { threshold: 0.2 });
  document.querySelectorAll(".section").forEach((s) => io.observe(s));

  /* animated counters in the fact strip */
  const factStrip = document.querySelector(".fact-strip");
  const fio = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    fio.disconnect();
    factStrip.classList.add("in-view");
    document.querySelectorAll(".fact-n").forEach((el) => {
      const target = +el.dataset.count;
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      const fmt = (n) => n >= 1000000 ? (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + "M" : Math.round(n).toLocaleString();
      const t0 = performance.now(), dur = 1100;
      (function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + fmt(target * eased) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.3 });
  fio.observe(factStrip);

  /* ============ konami easter egg ============ */
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let kIdx = 0;
  window.addEventListener("keydown", (ev) => {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) {
      kIdx = 0;
      toast("Konami code — nicely done. This site is hand-written vanilla HTML/CSS/JS; the webhook simulator is ~150 lines. View source.");
    }
  });

  /* ============================================================
     Webhook delivery simulator
     Producer → Event bus → Queue → (circuit breaker) → Client
     ============================================================ */
  const S = {
    clientUp: true,
    delivered: 0,
    retries: 0,
    dlq: 0,
    breaker: "CLOSED",       // CLOSED | OPEN | HALF-OPEN
    consecutiveFails: 0,
    inFlight: 0,
    seq: 0,
    breakerTimer: null,
  };
  const FAIL_THRESHOLD = 3;
  const BREAKER_COOLDOWN = 4000;
  const MAX_ATTEMPTS = 4;
  const deliverQueue = [];

  const el = (id) => document.getElementById(id);
  const log = el("simLog");

  function slog(msg, cls = "") {
    const line = document.createElement("div");
    if (cls) line.className = cls;
    line.textContent = msg;
    log.appendChild(line);
    while (log.childElementCount > 60) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  function render() {
    el("queueDepth").textContent = deliverQueue.length;
    el("mDelivered").textContent = S.delivered;
    el("mRetries").textContent = S.retries;
    el("mDlq").textContent = S.dlq;
    el("mBreaker").textContent = S.breaker;
    el("breakerState").textContent = S.breaker;
    const b = el("breaker");
    b.classList.toggle("open", S.breaker === "OPEN");
    b.classList.toggle("half", S.breaker === "HALF-OPEN");
    el("simReplay").disabled = S.dlq === 0;
  }

  function zap(nodeId) {
    const n = el(nodeId);
    n.classList.add("zap");
    setTimeout(() => n.classList.remove("zap"), 320);
  }

  function packet(wireId, fail, dur = 380) {
    const w = el(wireId);
    const p = document.createElement("div");
    p.className = "sim-packet" + (fail ? " fail" : "");
    w.appendChild(p);
    p.animate(
      [{ left: "0%" }, { left: "calc(100% - 10px)" }],
      { duration: dur, easing: "linear", fill: "forwards" }
    );
    setTimeout(() => p.remove(), dur + 60);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function tripBreaker() {
    if (S.breaker === "OPEN") return;
    S.breaker = "OPEN";
    slog(`breaker OPEN after ${FAIL_THRESHOLD} consecutive failures — fast-failing to spare the client`, "l-err");
    clearTimeout(S.breakerTimer);
    S.breakerTimer = setTimeout(() => {
      S.breaker = "HALF-OPEN";
      slog("breaker HALF-OPEN — letting one probe request through", "l-warn");
      render();
      pump();
    }, BREAKER_COOLDOWN);
    render();
  }

  async function attemptDelivery(evt) {
    packet("wire3", !S.clientUp, 420);
    await sleep(420);
    zap("nodeClient");

    if (S.clientUp) {
      S.delivered++;
      S.consecutiveFails = 0;
      if (S.breaker === "HALF-OPEN") {
        S.breaker = "CLOSED";
        slog("probe succeeded — breaker CLOSED, resuming normal delivery", "l-ok");
      }
      slog(`event #${evt.id} delivered (attempt ${evt.attempt}) — 200 OK, signature verified`, "l-ok");
      render();
      return;
    }

    S.consecutiveFails++;
    if (S.breaker === "HALF-OPEN") {
      slog(`probe event #${evt.id} failed — breaker back to OPEN`, "l-err");
      S.breaker = "CLOSED";
      tripBreaker();
    } else {
      slog(`event #${evt.id} attempt ${evt.attempt} failed — client unreachable`, "l-err");
      if (S.consecutiveFails >= FAIL_THRESHOLD) tripBreaker();
    }

    if (evt.attempt >= MAX_ATTEMPTS) {
      S.dlq++;
      slog(`event #${evt.id} exhausted ${MAX_ATTEMPTS} attempts — parked in the dead-letter queue for replay`, "l-err");
      render();
      return;
    }

    const backoff = 500 * Math.pow(2, evt.attempt - 1);
    S.retries++;
    evt.attempt++;
    slog(`event #${evt.id} retrying in ${backoff}ms — exponential backoff, attempt ${evt.attempt}/${MAX_ATTEMPTS}`, "l-warn");
    render();
    setTimeout(() => { deliverQueue.push(evt); pump(); }, backoff);
  }

  async function pump() {
    if (S.inFlight >= 1) return;
    if (S.breaker === "OPEN") return;
    const evt = deliverQueue.shift();
    if (!evt) return;
    S.inFlight++;
    render();
    await attemptDelivery(evt);
    S.inFlight--;
    render();
    if (S.breaker === "HALF-OPEN" && deliverQueue.length) return;
    pump();
  }

  async function fireEvent() {
    const evt = { id: ++S.seq, attempt: 1 };
    zap("nodeProducer");
    packet("wire1", false, 300);
    await sleep(300);
    zap("nodeBus");
    slog(`event #${evt.id} published — payload signed, correlation-id attached`);
    packet("wire2", false, 300);
    await sleep(300);
    zap("nodeQueue");
    deliverQueue.push(evt);
    render();
    pump();
  }

  function markPlayed() {
    if (!playedSim) { playedSim = true; maybeFinish(); }
  }

  el("simFire").addEventListener("click", () => { markPlayed(); fireEvent(); });

  el("simBurst").addEventListener("click", async () => {
    markPlayed();
    for (let i = 0; i < 10; i++) { fireEvent(); await sleep(150); }
  });

  el("simClientToggle").addEventListener("click", (e) => {
    markPlayed();
    S.clientUp = !S.clientUp;
    const btn = e.currentTarget;
    btn.dataset.up = S.clientUp ? "1" : "0";
    btn.innerHTML = S.clientUp
      ? '<span class="dot dot-ok"></span>Client: healthy — click to take it down'
      : '<span class="dot dot-err"></span>Client: down — click to recover';
    el("clientTag").textContent = S.clientUp ? "HTTPS" : "503";
    el("nodeClient").classList.toggle("dead", !S.clientUp);
    slog(S.clientUp ? "client recovered" : "client taken down — watch the failure handling", S.clientUp ? "l-ok" : "l-err");
    render();
    if (S.clientUp) pump();
  });

  el("simReplay").addEventListener("click", () => {
    if (!S.dlq) return;
    const n = S.dlq;
    S.dlq = 0;
    slog(`replaying ${n} event(s) from the dead-letter queue — idempotency keys prevent double-delivery`, "l-warn");
    for (let i = 0; i < n; i++) deliverQueue.push({ id: ++S.seq, attempt: 1 });
    render();
    pump();
  });

  slog("simulator ready — send an event to begin");
  render();
})();
