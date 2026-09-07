import { describe, expect, it } from "vitest";
import { advance, applyCommand, createInitialState, deadLetters, deliveriesFor, listDeliveries, summary } from "@/lib/sim/engine";
import { PRESETS, PRESET_ORDER, isPresetName } from "@/lib/sim/presets";
import type { PresetName, SimState } from "@/lib/sim/types";

function load(name: PresetName): SimState {
  return applyCommand(createInitialState(), { type: "loadPreset", name });
}

function play(name: PresetName, untilMs: number): SimState {
  return advance(load(name), untilMs);
}

describe("preset catalogue", () => {
  it("lists every preset once, each with an explanation and a sorted script of plain commands", () => {
    expect([...PRESET_ORDER].sort()).toEqual(Object.keys(PRESETS).sort());
    for (const name of PRESET_ORDER) {
      const preset = PRESETS[name];
      expect(preset.name).toBe(name);
      expect(preset.title.length).toBeGreaterThan(0);
      expect(preset.explanation.length).toBeGreaterThan(120);
      expect(preset.explanation).not.toMatch(/[–—]/); // no en or em dashes in copy
      expect(preset.script.length).toBeGreaterThan(0);
      const times = preset.script.map((s) => s.at);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(preset.script.every((s) => s.command.type !== "reset" && s.command.type !== "loadPreset")).toBe(true);
    }
    expect(isPresetName("failure")).toBe(true);
    expect(isPresetName("nonsense")).toBe(false);
  });

  it("loading a preset resets the pipeline and records the preset name", () => {
    let s = applyCommand(createInitialState(), { type: "burst", count: 10 });
    s = advance(s, 2000);
    s = applyCommand(s, { type: "loadPreset", name: "healthy" });
    expect(s.now).toBe(0);
    expect(s.preset).toBe("healthy");
    expect(s.counters.eventsSent).toBe(1);
    expect(s.log[0].message).toContain("Preset loaded: Healthy");
  });

  it("is deterministic: loading and playing twice gives deep-equal states", () => {
    for (const name of PRESET_ORDER) {
      expect(play(name, 45_000)).toEqual(play(name, 45_000));
    }
  });
});

describe("healthy", () => {
  it("delivers everything first time and shows the rate limiter pacing the burst", () => {
    const s = play("healthy", 30_000);
    expect(summary(s)).toMatchObject({
      eventsSent: 9,
      deliveries: 27,
      delivered: 27,
      deadLettered: 0,
      failedAttempts: 0,
      deferredAttempts: 0,
      effectsApplied: 27,
      duplicatesIgnored: 0,
      outstanding: 0,
    });
    expect(listDeliveries(s).every((d) => d.attempts === 1)).toBe(true);
    // The burst of six at 2.6 s cannot finish before 5.6 s: three tokens, then one per second.
    const burstA = deliveriesFor(s, "A").filter((d) => d.createdAt === 2600);
    expect(burstA).toHaveLength(6);
    expect(Math.max(...burstA.map((d) => d.completedAt ?? 0))).toBeGreaterThanOrEqual(5600);
    expect(burstA.every((d) => d.history[0].startedAt >= d.createdAt)).toBe(true);
  });
});

describe("failure", () => {
  it("opens A's circuit, keeps probing, dead-letters exhausted deliveries and never starves B or C", () => {
    const s = play("failure", 60_000);
    expect(s.counters.circuitOpens).toBeGreaterThanOrEqual(3);
    expect(s.subscribers.A.health).toBe("failing");
    expect(s.subscribers.A.delivered).toBe(0);
    expect(s.subscribers.A.deadLettered).toBeGreaterThanOrEqual(1);
    const dead = deadLetters(s);
    expect(dead.every((d) => d.subscriberId === "A" && d.attempts === 5 && d.failures === 5)).toBe(true);
    expect(dead.every((d) => d.deadLetterReason?.includes("failure budget"))).toBe(true);
    expect(deliveriesFor(s, "A").every((d) => d.attempts <= 5)).toBe(true);
    for (const id of ["B", "C"] as const) {
      expect(s.subscribers[id]).toMatchObject({ delivered: 7, failed: 0, deadLettered: 0, effectsApplied: 7 });
    }
    // The first dead letter is the oldest delivery, and it arrives well inside a minute.
    expect(dead[0].id).toBe("dlv-0001");
    expect(dead[0].completedAt).toBeLessThan(25_000);
  });
});

describe("recovery", () => {
  it("fails one probe, closes on the second and drains everything with no dead letters", () => {
    const s = play("recovery", 40_000);
    expect(s.subscribers.A.health).toBe("healthy");
    expect(s.subscribers.A.circuit.state).toBe("closed");
    expect(s.counters.circuitOpens).toBe(2);
    expect(summary(s)).toMatchObject({ deliveries: 15, delivered: 15, deadLettered: 0, outstanding: 0 });
    const probes = deliveriesFor(s, "A")
      .flatMap((d) => d.history)
      .filter((h) => h.probe)
      .sort((a, b) => a.completedAt - b.completedAt);
    expect(probes.map((p) => p.outcome)).toEqual(["failure", "success"]);
    // The circuit stayed open across the repair at 9 s and closed only once the probe succeeded.
    const closedAt = s.log.find((l) => l.message.includes("Circuit closed for Subscriber A"))?.at;
    expect(closedAt).toBeGreaterThan(9000);
    expect(closedAt).toBe(probes[1].completedAt);
  });
});

describe("rate-limit", () => {
  it("retries exactly at Retry-After, counts no failures and completes after A is restored", () => {
    const s = play("rate-limit", 40_000);
    expect(s.subscribers.A.deferred).toBeGreaterThanOrEqual(4);
    expect(s.subscribers.A).toMatchObject({ failed: 0, deadLettered: 0, delivered: 4 });
    expect(s.counters.circuitOpens).toBe(0);
    expect(summary(s)).toMatchObject({ deliveries: 12, delivered: 12, deadLettered: 0 });
    for (const d of deliveriesFor(s, "A")) {
      expect(d.failures).toBe(0);
      expect(d.deferrals).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < d.history.length; i += 1) {
        expect(d.history[i - 1].status).toBe(429);
        expect(d.history[i].startedAt - d.history[i - 1].completedAt).toBe(4000);
      }
      expect(d.history.at(-1)?.status).toBe(200);
    }
  });
});

describe("lost-response", () => {
  it("applies each effect once and acknowledges the retries as duplicates", () => {
    const s = play("lost-response", 10_000);
    expect(s.subscribers.A).toMatchObject({ effectsApplied: 2, duplicatesIgnored: 2, delivered: 2, failed: 2, deadLettered: 0 });
    for (const d of deliveriesFor(s, "A")) {
      expect(d.state).toBe("delivered");
      expect(d.history.map((h) => h.outcome)).toEqual(["timeout", "duplicate-ignored"]);
    }
    expect(s.subscribers.B).toMatchObject({ effectsApplied: 2, duplicatesIgnored: 0 });
    expect(summary(s).outstanding).toBe(0);
  });
});
