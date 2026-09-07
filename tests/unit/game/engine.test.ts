import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  MILESTONES,
  createGame,
  currentSpeed,
  moveLane,
  nextRandom,
  pauseGame,
  setLane,
  startGame,
  statusText,
  step,
  summary,
  togglePause,
  type GameState,
  type Lane,
  type ObjectKind,
} from "@/lib/game/engine";
import { lanePosition, routeAt, routeTangent } from "@/lib/game/route";

function run(state: GameState, seconds: number, dt = 1 / 60) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) step(state, dt);
}

/** Put one object right in front of the pulse. */
function plant(state: GameState, kind: ObjectKind, lane: Lane, ahead = 2) {
  state.objects.push({ id: state.nextId++, kind, lane, at: state.distance + ahead, spent: false });
}

describe("Throughput engine", () => {
  it("is deterministic for a seed and input sequence", () => {
    const a = createGame(42);
    const b = createGame(42);
    startGame(a);
    startGame(b);
    for (let i = 0; i < 600; i++) {
      if (i % 90 === 0) {
        moveLane(a, 1);
        moveLane(b, 1);
      }
      step(a, 1 / 60);
      step(b, 1 / 60);
    }
    expect(a.score).toBe(b.score);
    expect(a.distance).toBeCloseTo(b.distance, 9);
    expect(a.objects.map((o) => `${o.kind}:${o.lane}:${o.at.toFixed(3)}`)).toEqual(
      b.objects.map((o) => `${o.kind}:${o.lane}:${o.at.toFixed(3)}`),
    );
  });

  it("only runs while started and honours pause", () => {
    const g = createGame(1);
    step(g, 0.5);
    expect(g.distance).toBe(0);
    startGame(g);
    step(g, 0.05);
    expect(g.distance).toBeGreaterThan(0);
    const d = g.distance;
    pauseGame(g);
    step(g, 0.5);
    expect(g.distance).toBe(d);
    togglePause(g);
    step(g, 0.05);
    expect(g.distance).toBeGreaterThan(d);
  });

  it("clamps long frames so a background tab never teleports the pulse", () => {
    const g = createGame(3);
    startGame(g);
    step(g, 2);
    expect(g.t).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it("keeps objects bounded and ahead of the pulse", () => {
    const g = createGame(7);
    startGame(g);
    run(g, 120);
    expect(g.objects.length).toBeLessThanOrEqual(DEFAULT_CONFIG.maxObjects);
    for (const o of g.objects) {
      expect(o.at - g.distance).toBeGreaterThanOrEqual(-DEFAULT_CONFIG.despawnBehind);
      expect(o.at - g.distance).toBeLessThanOrEqual(DEFAULT_CONFIG.spawnAhead + 60);
      expect([-1, 0, 1]).toContain(o.lane);
    }
    expect(g.patternsSpawned).toBeGreaterThan(10);
  });

  it("scores tokens with a streak multiplier and burst doubling", () => {
    const g = createGame(5);
    startGame(g);
    g.objects = [];
    g.nextSpawnAt = 1e9; // stop natural spawning
    for (let i = 0; i < 10; i++) plant(g, "token", 0, 1 + i * 2);
    run(g, 2);
    expect(g.tokensCollected).toBe(10);
    expect(g.streak).toBe(10);
    expect(g.multiplier).toBe(2);
    expect(g.score).toBe(10);
    plant(g, "burst", 0, 1);
    plant(g, "token", 0, 3);
    run(g, 1);
    expect(g.score).toBe(10 + 2 * 2);
  });

  it("loses a retry on a fault, resets the streak, and ends at zero", () => {
    const g = createGame(9);
    startGame(g);
    g.objects = [];
    g.nextSpawnAt = 1e9;
    plant(g, "token", 0, 1);
    plant(g, "fault", 0, 3);
    run(g, 1);
    expect(g.lives).toBe(2);
    expect(g.streak).toBe(0);
    expect(g.faultsHit).toBe(1);
    // Invulnerability window: a second fault right behind does not count.
    plant(g, "fault", 0, 1);
    run(g, 0.3);
    expect(g.lives).toBe(2);
    run(g, 1.5);
    plant(g, "fault", 0, 1);
    run(g, 1.5);
    plant(g, "fault", 0, 1);
    run(g, 1.5);
    expect(g.lives).toBe(0);
    expect(g.phase).toBe("over");
    expect(statusText(g)).toContain("Dead-lettered");
  });

  it("absorbs one fault with a circuit breaker", () => {
    const g = createGame(11);
    startGame(g);
    g.objects = [];
    g.nextSpawnAt = 1e9;
    plant(g, "shield", 0, 1);
    plant(g, "fault", 0, 4);
    run(g, 1);
    expect(g.shield).toBe(false);
    expect(g.lives).toBe(3);
  });

  it("slows through a rate-limit gate unless bursting", () => {
    const g = createGame(13);
    startGame(g);
    g.objects = [];
    g.nextSpawnAt = 1e9;
    const before = currentSpeed(g);
    plant(g, "gate", 0, 1);
    run(g, 0.2);
    expect(currentSpeed(g)).toBeLessThan(before);
    run(g, 2);
    expect(currentSpeed(g)).toBeGreaterThan(before * 0.9);
    plant(g, "burst", 0, 1);
    run(g, 0.2);
    plant(g, "gate", 0, 1);
    run(g, 0.2);
    expect(g.t < g.slowUntil).toBe(false);
  });

  it("restores a retry when one is missing, otherwise pays out score", () => {
    const g = createGame(17);
    startGame(g);
    g.objects = [];
    g.nextSpawnAt = 1e9;
    plant(g, "retry", 0, 1);
    run(g, 0.5);
    expect(g.lives).toBe(3);
    expect(g.score).toBe(25);
    g.lives = 1;
    plant(g, "retry", 0, 1);
    run(g, 0.5);
    expect(g.lives).toBe(2);
  });

  it("eases lane changes and clamps to the three lanes", () => {
    const g = createGame(19);
    startGame(g);
    moveLane(g, 1);
    moveLane(g, 1);
    expect(g.targetLane).toBe(1);
    step(g, 1 / 60);
    expect(g.laneX).toBeGreaterThan(0);
    expect(g.laneX).toBeLessThan(1);
    run(g, 0.5);
    expect(g.laneX).toBeCloseTo(1, 5);
    setLane(g, -1);
    run(g, 0.5);
    expect(g.laneX).toBeCloseTo(-1, 5);
  });

  it("raises milestones in order", () => {
    const g = createGame(23);
    startGame(g);
    g.objects = [];
    g.nextSpawnAt = 1e9;
    g.score = MILESTONES[0].value - 1;
    plant(g, "token", 0, 1);
    run(g, 0.5);
    expect(g.milestoneIndex).toBe(1);
    expect(summary(g).delivered).toBeGreaterThanOrEqual(MILESTONES[0].value);
  });

  it("seeded random stays in [0, 1) and differs by seed", () => {
    const a = createGame(1);
    const b = createGame(2);
    const va = Array.from({ length: 5 }, () => nextRandom(a));
    const vb = Array.from({ length: 5 }, () => nextRandom(b));
    expect(va.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(va).not.toEqual(vb);
  });
});

describe("route", () => {
  it("is continuous with unit tangents and consistent lane offsets", () => {
    for (let s = 0; s < 400; s += 7.3) {
      const t = routeTangent(s);
      expect(Math.hypot(t.x, t.y, t.z)).toBeCloseTo(1, 6);
      const left = lanePosition(s, -1, 1.6);
      const right = lanePosition(s, 1, 1.6);
      const centre = routeAt(s);
      const w = Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
      expect(w).toBeCloseTo(3.2, 3);
      expect(Math.hypot(centre.x - (left.x + right.x) / 2, centre.z - (left.z + right.z) / 2)).toBeLessThan(1e-6);
    }
  });
});
