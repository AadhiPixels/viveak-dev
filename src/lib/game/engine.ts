/**
 * Throughput: a small, deterministic arcade engine.
 *
 * You pilot a delivery pulse along a chrome route through a distributed system.
 * Collect acknowledged deliveries, dodge 503 faults, accept the occasional 429
 * rate-limit gate, and use circuit breakers, retries and bursts wisely. The
 * vocabulary borrows from the real platform work described on the site; the
 * numbers are game numbers, nothing here is production data.
 *
 * The engine is pure TypeScript with no DOM, timers or randomness beyond a
 * seeded generator, so a run with the same seed and inputs always plays the
 * same way and the whole thing is unit-testable. Rendering and input live in
 * React components that read this state every frame.
 */

export type Lane = -1 | 0 | 1;
export type ObjectKind = "token" | "fault" | "gate" | "shield" | "retry" | "burst";
export type Phase = "ready" | "running" | "paused" | "over";

export interface GameObject {
  id: number;
  kind: ObjectKind;
  lane: Lane;
  /** Absolute distance along the route. */
  at: number;
  /** Set once the object has been collected or has hit the player. */
  spent: boolean;
}

export type GameEvent =
  | { type: "token"; lane: Lane; value: number }
  | { type: "fault"; lane: Lane; absorbed: boolean }
  | { type: "gate" }
  | { type: "shield" }
  | { type: "retry"; restored: boolean }
  | { type: "burst" }
  | { type: "milestone"; value: number; caption: string }
  | { type: "over" };

export interface GameConfig {
  laneWidth: number;
  baseSpeed: number;
  acceleration: number;
  maxSpeed: number;
  spawnAhead: number;
  despawnBehind: number;
  maxObjects: number;
  lives: number;
  hitCooldown: number;
  gateSlowFactor: number;
  gateDuration: number;
  burstDuration: number;
  burstSpeedFactor: number;
  laneSwitchSpeed: number;
  collisionZ: number;
  collisionLane: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  laneWidth: 1.6,
  baseSpeed: 15,
  acceleration: 0.32,
  maxSpeed: 44,
  spawnAhead: 130,
  despawnBehind: 8,
  maxObjects: 96,
  lives: 3,
  hitCooldown: 1.2,
  gateSlowFactor: 0.55,
  gateDuration: 1.6,
  burstDuration: 4.5,
  burstSpeedFactor: 1.3,
  laneSwitchSpeed: 9,
  collisionZ: 0.75,
  collisionLane: 0.55,
};

export const MILESTONES: { value: number; caption: string }[] = [
  { value: 100, caption: "100 delivered. The queue is warm." },
  { value: 250, caption: "250 delivered. Retries are doing their job." },
  { value: 500, caption: "500 delivered. Circuits holding." },
  { value: 1000, caption: "1,000 delivered. Back-pressure under control." },
  { value: 2500, caption: "2,500 delivered. This is a good day for the platform." },
  { value: 5000, caption: "5,000 delivered. Keep it moving." },
];

export interface GameState {
  config: GameConfig;
  phase: Phase;
  seed: number;
  rng: number;
  t: number;
  distance: number;
  speed: number;
  targetLane: Lane;
  /** Continuous lane position in lane units (-1 to 1). */
  laneX: number;
  lives: number;
  score: number;
  streak: number;
  bestStreak: number;
  multiplier: number;
  shield: boolean;
  slowUntil: number;
  burstUntil: number;
  hitUntil: number;
  objects: GameObject[];
  nextSpawnAt: number;
  nextId: number;
  milestoneIndex: number;
  events: GameEvent[];
  patternsSpawned: number;
  faultsHit: number;
  tokensCollected: number;
}

/* ------------------------------------------------------------------ */
/* Seeded randomness (mulberry32)                                       */
/* ------------------------------------------------------------------ */

export function nextRandom(state: GameState): number {
  let a = (state.rng += 0x6d2b79f5) >>> 0;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  state.rng = state.rng >>> 0;
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(state: GameState, items: readonly T[]): T {
  return items[Math.floor(nextRandom(state) * items.length)];
}

/* ------------------------------------------------------------------ */
/* Patterns: authored shapes, chosen by difficulty                       */
/* ------------------------------------------------------------------ */

interface PatternObject {
  dz: number;
  lane: Lane;
  kind: ObjectKind;
}

interface Pattern {
  id: string;
  /** Route length the pattern occupies. */
  length: number;
  minDifficulty: number;
  weight: number;
  build: (state: GameState) => PatternObject[];
}

const LANES: Lane[] = [-1, 0, 1];

function otherLanes(lane: Lane): Lane[] {
  return LANES.filter((l) => l !== lane);
}

const PATTERNS: Pattern[] = [
  {
    id: "straight-tokens",
    length: 24,
    minDifficulty: 0,
    weight: 3,
    build: (s) => {
      const lane = pick(s, LANES);
      return [0, 4, 8, 12, 16].map((dz) => ({ dz, lane, kind: "token" as const }));
    },
  },
  {
    id: "zigzag-tokens",
    length: 30,
    minDifficulty: 0,
    weight: 3,
    build: (s) => {
      const start = pick(s, LANES);
      const dir = start === 1 ? -1 : start === -1 ? 1 : pick(s, [-1, 1] as const);
      const lanes: Lane[] = [start, (start + dir) as Lane, start, (start + dir) as Lane];
      return lanes.map((lane, i) => ({ dz: i * 6, lane, kind: "token" as const }));
    },
  },
  {
    id: "single-fault",
    length: 22,
    minDifficulty: 0.05,
    weight: 3,
    build: (s) => {
      const lane = pick(s, LANES);
      const safe = pick(s, otherLanes(lane));
      return [
        { dz: 0, lane, kind: "fault" },
        { dz: 4, lane: safe, kind: "token" },
        { dz: 8, lane: safe, kind: "token" },
      ];
    },
  },
  {
    id: "fault-wall-with-gap",
    length: 26,
    minDifficulty: 0.25,
    weight: 3,
    build: (s) => {
      const gap = pick(s, LANES);
      const out: PatternObject[] = otherLanes(gap).map((lane) => ({ dz: 0, lane, kind: "fault" as const }));
      out.push({ dz: 5, lane: gap, kind: "token" }, { dz: 10, lane: gap, kind: "token" });
      return out;
    },
  },
  {
    id: "gate-then-tokens",
    length: 28,
    minDifficulty: 0.15,
    weight: 2,
    build: (s) => {
      const lane = pick(s, LANES);
      return [
        { dz: 0, lane: -1, kind: "gate" },
        { dz: 0, lane: 0, kind: "gate" },
        { dz: 0, lane: 1, kind: "gate" },
        { dz: 8, lane, kind: "token" },
        { dz: 12, lane, kind: "token" },
        { dz: 16, lane, kind: "token" },
      ];
    },
  },
  {
    id: "shield-then-double-fault",
    length: 34,
    minDifficulty: 0.35,
    weight: 2,
    build: (s) => {
      const lane = pick(s, LANES);
      const faultLane = pick(s, LANES);
      return [
        { dz: 0, lane, kind: "shield" },
        ...otherLanes(faultLane).map((l) => ({ dz: 12, lane: l, kind: "fault" as const })),
        ...otherLanes(faultLane).map((l) => ({ dz: 20, lane: l, kind: "fault" as const })),
        { dz: 26, lane: faultLane, kind: "token" },
      ];
    },
  },
  {
    id: "burst-lane",
    length: 40,
    minDifficulty: 0.3,
    weight: 2,
    build: (s) => {
      const lane = pick(s, LANES);
      const out: PatternObject[] = [{ dz: 0, lane, kind: "burst" }];
      for (let i = 1; i <= 6; i++) out.push({ dz: i * 5, lane, kind: "token" });
      const faultLane = pick(s, otherLanes(lane));
      out.push({ dz: 15, lane: faultLane, kind: "fault" }, { dz: 25, lane: faultLane, kind: "fault" });
      return out;
    },
  },
  {
    id: "retry-hidden",
    length: 28,
    minDifficulty: 0.45,
    weight: 1,
    build: (s) => {
      const lane = pick(s, LANES);
      return [
        ...otherLanes(lane).map((l) => ({ dz: 0, lane: l, kind: "fault" as const })),
        { dz: 8, lane, kind: "retry" },
        ...otherLanes(lane).map((l) => ({ dz: 14, lane: l, kind: "fault" as const })),
      ];
    },
  },
  {
    id: "staggered-faults",
    length: 36,
    minDifficulty: 0.55,
    weight: 3,
    build: (s) => {
      const first = pick(s, LANES);
      const second = pick(s, otherLanes(first));
      const third = pick(s, otherLanes(second));
      return [
        { dz: 0, lane: first, kind: "fault" },
        { dz: 8, lane: second, kind: "fault" },
        { dz: 16, lane: third, kind: "fault" },
        { dz: 22, lane: pick(s, otherLanes(third)), kind: "token" },
        { dz: 26, lane: pick(s, LANES), kind: "token" },
      ];
    },
  },
];

/* ------------------------------------------------------------------ */
/* Lifecycle                                                             */
/* ------------------------------------------------------------------ */

export function createGame(seed = 1, config: GameConfig = DEFAULT_CONFIG): GameState {
  return {
    config,
    phase: "ready",
    seed,
    rng: seed >>> 0,
    t: 0,
    distance: 0,
    speed: config.baseSpeed,
    targetLane: 0,
    laneX: 0,
    lives: config.lives,
    score: 0,
    streak: 0,
    bestStreak: 0,
    multiplier: 1,
    shield: false,
    slowUntil: 0,
    burstUntil: 0,
    hitUntil: 0,
    objects: [],
    nextSpawnAt: 30,
    nextId: 1,
    milestoneIndex: 0,
    events: [],
    patternsSpawned: 0,
    faultsHit: 0,
    tokensCollected: 0,
  };
}

export function startGame(state: GameState) {
  if (state.phase === "ready" || state.phase === "paused") state.phase = "running";
}

export function pauseGame(state: GameState) {
  if (state.phase === "running") state.phase = "paused";
}

export function togglePause(state: GameState) {
  if (state.phase === "running") state.phase = "paused";
  else if (state.phase === "paused") state.phase = "running";
}

export function moveLane(state: GameState, direction: -1 | 1) {
  if (state.phase !== "running") return;
  const next = Math.max(-1, Math.min(1, state.targetLane + direction)) as Lane;
  state.targetLane = next;
}

export function setLane(state: GameState, lane: Lane) {
  if (state.phase !== "running") return;
  state.targetLane = lane;
}

/** Difficulty in [0, 1] from time survived. */
export function difficulty(state: GameState) {
  return Math.min(1, state.t / 90);
}

export function currentSpeed(state: GameState) {
  const c = state.config;
  let speed = Math.min(c.maxSpeed, c.baseSpeed + c.acceleration * state.t);
  if (state.t < state.slowUntil) speed *= c.gateSlowFactor;
  if (state.t < state.burstUntil) speed *= c.burstSpeedFactor;
  return speed;
}

function spawnPattern(state: GameState) {
  const d = difficulty(state);
  const eligible = PATTERNS.filter((p) => p.minDifficulty <= d);
  const total = eligible.reduce((a, p) => a + p.weight, 0);
  let r = nextRandom(state) * total;
  let chosen = eligible[eligible.length - 1];
  for (const p of eligible) {
    r -= p.weight;
    if (r <= 0) {
      chosen = p;
      break;
    }
  }
  const start = state.nextSpawnAt;
  for (const o of chosen.build(state)) {
    if (state.objects.length >= state.config.maxObjects) break;
    state.objects.push({ id: state.nextId++, kind: o.kind, lane: o.lane, at: start + o.dz, spent: false });
  }
  // Breathing room shrinks with difficulty so the route gets denser.
  const gap = 10 - 6 * d;
  state.nextSpawnAt = start + chosen.length + gap;
  state.patternsSpawned++;
}

/** Advance the game by dt seconds. Events raised during the step are in state.events. */
export function step(state: GameState, dt: number) {
  state.events = [];
  if (state.phase !== "running") return;
  const c = state.config;
  const clamped = Math.min(dt, 0.05);
  state.t += clamped;
  state.speed = currentSpeed(state);
  state.distance += state.speed * clamped;

  // Lane easing.
  const diff = state.targetLane - state.laneX;
  const maxMove = c.laneSwitchSpeed * clamped;
  state.laneX += Math.abs(diff) <= maxMove ? diff : Math.sign(diff) * maxMove;

  // Spawn ahead.
  while (state.nextSpawnAt < state.distance + c.spawnAhead && state.objects.length < c.maxObjects) {
    spawnPattern(state);
  }

  // Collisions and clean-up.
  const keep: GameObject[] = [];
  for (const o of state.objects) {
    const z = o.at - state.distance;
    if (z < -c.despawnBehind) continue;
    if (!o.spent && Math.abs(z) < c.collisionZ && Math.abs(o.lane - state.laneX) < c.collisionLane) {
      o.spent = true;
      collide(state, o);
    }
    keep.push(o);
  }
  state.objects = keep;

  // Milestones.
  const m = MILESTONES[state.milestoneIndex];
  if (m && state.score >= m.value) {
    state.milestoneIndex++;
    state.events.push({ type: "milestone", value: m.value, caption: m.caption });
  }
}

function collide(state: GameState, o: GameObject) {
  const c = state.config;
  switch (o.kind) {
    case "token": {
      const value = state.multiplier * (state.t < state.burstUntil ? 2 : 1);
      state.score += value;
      state.tokensCollected++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.multiplier = Math.min(5, 1 + Math.floor(state.streak / 10));
      state.events.push({ type: "token", lane: o.lane, value });
      break;
    }
    case "fault": {
      if (state.t < state.hitUntil) {
        o.spent = false; // still there, but the pulse is briefly untouchable
        return;
      }
      state.faultsHit++;
      if (state.shield) {
        state.shield = false;
        state.events.push({ type: "fault", lane: o.lane, absorbed: true });
        state.hitUntil = state.t + 0.6;
        return;
      }
      state.lives--;
      state.streak = 0;
      state.multiplier = 1;
      state.hitUntil = state.t + c.hitCooldown;
      state.events.push({ type: "fault", lane: o.lane, absorbed: false });
      if (state.lives <= 0) {
        state.phase = "over";
        state.events.push({ type: "over" });
      }
      break;
    }
    case "gate": {
      if (state.t < state.burstUntil) return;
      state.slowUntil = state.t + c.gateDuration;
      state.events.push({ type: "gate" });
      break;
    }
    case "shield": {
      state.shield = true;
      state.events.push({ type: "shield" });
      break;
    }
    case "retry": {
      const restored = state.lives < c.lives;
      if (restored) state.lives++;
      else state.score += 25;
      state.events.push({ type: "retry", restored });
      break;
    }
    case "burst": {
      state.burstUntil = state.t + c.burstDuration;
      state.events.push({ type: "burst" });
      break;
    }
  }
}

/** Plain-language status for the HUD and assistive technology. */
export function statusText(state: GameState): string {
  if (state.phase === "ready") return "Ready. Press Space or tap Play.";
  if (state.phase === "paused") return "Paused.";
  if (state.phase === "over") return `Dead-lettered after ${state.score.toLocaleString("en-GB")} deliveries.`;
  const bits = [`${state.score.toLocaleString("en-GB")} delivered`, `${state.lives} ${state.lives === 1 ? "retry" : "retries"} left`];
  if (state.shield) bits.push("circuit breaker armed");
  if (state.t < state.slowUntil) bits.push("rate limited");
  if (state.t < state.burstUntil) bits.push("burst");
  return bits.join(", ") + ".";
}

/** Summary lines for the game-over screen. */
export function summary(state: GameState) {
  return {
    delivered: state.score,
    bestStreak: state.bestStreak,
    seconds: Math.round(state.t),
    faults: state.faultsHit,
    tokens: state.tokensCollected,
    topSpeed: Math.round(currentSpeed(state)),
  };
}
