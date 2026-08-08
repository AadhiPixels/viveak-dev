/* viveakv.dev — XP system, easter eggs, webhook delivery simulator */
(() => {
  "use strict";

  document.body.classList.add("crt");
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ============ toasts ============ */
  const toasts = document.getElementById("toasts");
  function toast(msg, gold = false) {
    const el = document.createElement("div");
    el.className = "toast" + (gold ? " gold" : "");
    el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(() => el.classList.add("out"), 3200);
    setTimeout(() => el.remove(), 3600);
  }

  /* ============ XP / levels ============ */
  const XP_PER_LEVEL = 100;
  let xp = 0, level = 1;
  const xpEl = document.getElementById("xp");
  const lvlEl = document.getElementById("lvl");
  const xpFill = document.getElementById("xpFill");
  const awarded = new Set();

  function grantXP(key, amount, label) {
    if (key && awarded.has(key)) return;
    if (key) awarded.add(key);
    xp += amount;
    const newLevel = Math.floor(xp / XP_PER_LEVEL) + 1;
    xpEl.textContent = xp;
    xpFill.style.width = ((xp % XP_PER_LEVEL)) + "%";
    if (label) toast(`+${amount} XP — ${label}`);
    if (newLevel > level) {
      level = newLevel;
      lvlEl.textContent = level;
      toast(`⭐ LEVEL UP! You are now LVL ${level}`, true);
    }
  }

  /* ============ section reveal + XP for exploring ============ */
  const sectionXP = {
    stats: ["Stats inspected", 15],
    quests: ["Quest log opened", 20],
    boss: ["Entered the Boss Arena", 20],
    trophies: ["Trophy cabinet admired", 15],
    sidequests: ["Side quests discovered", 20],
    hire: ["Found the recruit screen", 25],
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in-view");
      const meta = sectionXP[e.target.id];
      if (meta) grantXP("sec:" + e.target.id, meta[1], meta[0]);
    }
  }, { threshold: 0.25 });
  document.querySelectorAll(".panel").forEach((p) => io.observe(p));

  document.getElementById("cvBtn")?.addEventListener("click", () =>
    grantXP("cv", 30, "CV acquired"));

  /* ============ avatar easter egg ============ */
  let avatarClicks = 0;
  document.getElementById("avatar").addEventListener("click", () => {
    avatarClicks++;
    if (avatarClicks === 5) {
      grantXP("avatar", 25, "You poked the player 5 times");
      toast("👋 ok ok, hi! email me: viveak.03@gmail.com", true);
    }
  });

  /* ============ Konami code ============ */
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let kIdx = 0;
  window.addEventListener("keydown", (ev) => {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) {
      kIdx = 0;
      unlockSecret();
    }
  });

  function unlockSecret() {
    const t = document.getElementById("secretTrophy");
    if (t.classList.contains("unlocked")) return;
    t.classList.add("unlocked");
    t.innerHTML = `
      <div class="trophy-icon">🕹️</div>
      <h3>KONAMI VETERAN</h3>
      <p>You found the secret. This whole site is vanilla HTML/CSS/JS - view source, it's all there.
      People who try the Konami code make excellent teammates.</p>
      <span class="trophy-xp">+1986 XP</span>`;
    document.body.classList.add("rainbow");
    grantXP("konami", 50, "SECRET TROPHY UNLOCKED");
    toast("🌈 ↑↑↓↓←→←→BA — a person of culture", true);
    t.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ============================================================
     Webhook delivery simulator
     Producer → Event Bus → Queue → (circuit breaker) → Client
     ============================================================ */
  const S = {
    clientUp: true,
    queue: 0,
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

  const el = (id) => document.getElementById(id);
  const wire3 = el("wire3");
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
    el("queueDepth").textContent = S.queue;
    el("mDelivered").textContent = S.delivered;
    el("mRetries").textContent = S.retries;
    el("mDlq").textContent = S.dlq;
    el("mBreaker").textContent = S.breaker;
    const b = el("breaker");
    el("breakerState").textContent = S.breaker === "HALF-OPEN" ? "HALF" : S.breaker;
    b.classList.toggle("open", S.breaker === "OPEN");
    b.classList.toggle("half", S.breaker === "HALF-OPEN");
    el("simReplay").disabled = S.dlq === 0;
  }

  function zap(nodeId) {
    const n = el(nodeId);
    n.classList.add("zap");
    setTimeout(() => n.classList.remove("zap"), 350);
  }

  function packet(wireId, fail, dur = 380) {
    const w = el(wireId);
    const p = document.createElement("div");
    p.className = "sim-packet" + (fail ? " fail" : "");
    w.appendChild(p);
    p.animate(
      [{ left: "0%" }, { left: "calc(100% - 14px)" }],
      { duration: dur, easing: "linear", fill: "forwards" }
    );
    setTimeout(() => p.remove(), dur + 60);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function tripBreaker() {
    if (S.breaker === "OPEN") return;
    S.breaker = "OPEN";
    slog(`⛔ circuit breaker OPEN after ${FAIL_THRESHOLD} consecutive failures — fast-failing, sparing the client`, "l-err");
    clearTimeout(S.breakerTimer);
    S.breakerTimer = setTimeout(() => {
      S.breaker = "HALF-OPEN";
      slog("🌗 breaker HALF-OPEN — letting one probe through", "l-warn");
      render();
      pump();
    }, BREAKER_COOLDOWN);
    render();
  }

  async function attemptDelivery(evt) {
    // travel across the breaker wire
    packet("wire3", !S.clientUp, 420);
    await sleep(420);
    zap("nodeClient");

    if (S.clientUp) {
      S.delivered++;
      S.consecutiveFails = 0;
      if (S.breaker === "HALF-OPEN") {
        S.breaker = "CLOSED";
        slog("✅ probe succeeded — breaker CLOSED, resuming normal delivery", "l-ok");
      }
      slog(`✅ evt#${evt.id} delivered (attempt ${evt.attempt}) — 200 OK, HMAC verified`, "l-ok");
      render();
      return true;
    }

    // failure path
    S.consecutiveFails++;
    if (S.breaker === "HALF-OPEN") {
      slog(`❌ probe evt#${evt.id} failed — breaker back to OPEN`, "l-err");
      S.breaker = "CLOSED"; // will re-trip below
      tripBreaker();
    } else {
      slog(`❌ evt#${evt.id} attempt ${evt.attempt} failed — client unreachable`, "l-err");
      if (S.consecutiveFails >= FAIL_THRESHOLD) tripBreaker();
    }

    if (evt.attempt >= MAX_ATTEMPTS) {
      S.dlq++;
      slog(`💀 evt#${evt.id} exhausted ${MAX_ATTEMPTS} attempts → parked in DLQ for replay`, "l-err");
      render();
      return true; // done with this event
    }

    const backoff = 500 * Math.pow(2, evt.attempt - 1);
    S.retries++;
    evt.attempt++;
    slog(`⏳ evt#${evt.id} retrying in ${backoff}ms (exponential backoff, attempt ${evt.attempt}/${MAX_ATTEMPTS})`, "l-warn");
    render();
    setTimeout(() => { deliverQueue.push(evt); pump(); }, backoff);
    return true;
  }

  const deliverQueue = [];

  async function pump() {
    if (S.inFlight >= 1) return;
    if (S.breaker === "OPEN") return;
    const evt = deliverQueue.shift();
    if (!evt) return;
    S.inFlight++;
    S.queue = Math.max(0, deliverQueue.length);
    render();
    await attemptDelivery(evt);
    S.inFlight--;
    S.queue = deliverQueue.length;
    render();
    if (S.breaker === "HALF-OPEN" && deliverQueue.length) return; // wait for probe verdict
    pump();
  }

  async function fireEvent() {
    const evt = { id: ++S.seq, attempt: 1 };
    zap("nodeProducer");
    packet("wire1", false, 300);
    await sleep(300);
    zap("nodeBus");
    slog(`📤 evt#${evt.id} published → bus (signed payload, correlation-id attached)`);
    packet("wire2", false, 300);
    await sleep(300);
    zap("nodeQueue");
    deliverQueue.push(evt);
    S.queue = deliverQueue.length;
    render();
    pump();
  }

  el("simFire").addEventListener("click", () => {
    fireEvent();
    grantXP("sim:fire", 15, "First event fired");
  });

  el("simBurst").addEventListener("click", async () => {
    grantXP("sim:burst", 20, "Load test initiated");
    for (let i = 0; i < 10; i++) { fireEvent(); await sleep(160); }
  });

  el("simClientToggle").addEventListener("click", (e) => {
    S.clientUp = !S.clientUp;
    const btn = e.currentTarget;
    btn.dataset.up = S.clientUp ? "1" : "0";
    btn.textContent = S.clientUp ? "🟢 CLIENT: HEALTHY" : "🔴 CLIENT: DOWN";
    el("clientIcon").textContent = S.clientUp ? "🖥️" : "🔥";
    el("nodeClient").classList.toggle("dead", !S.clientUp);
    slog(S.clientUp ? "🟢 client recovered" : "🔴 client went down — chaos engineering time", S.clientUp ? "l-ok" : "l-err");
    if (!S.clientUp) grantXP("sim:chaos", 25, "Chaos engineer");
    render();
    if (S.clientUp) pump();
  });

  el("simReplay").addEventListener("click", () => {
    if (!S.dlq) return;
    grantXP("sim:replay", 20, "DLQ drained like a pro");
    const n = S.dlq;
    S.dlq = 0;
    slog(`♻ replaying ${n} event(s) from DLQ — idempotency keys mean no double-delivery`, "l-warn");
    for (let i = 0; i < n; i++) deliverQueue.push({ id: ++S.seq, attempt: 1, replayed: true });
    S.queue = deliverQueue.length;
    render();
    pump();
  });

  slog("── webhook delivery simulator ready. fire an event. ──");
  render();
})();
