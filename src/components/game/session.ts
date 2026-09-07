import {
  createGame,
  moveLane,
  pauseGame,
  setLane,
  startGame,
  step,
  togglePause,
  type GameEvent,
  type GameState,
  type Lane,
  type Phase,
} from "@/lib/game/engine";

type Listener<T> = (value: T) => void;

/**
 * Owns one game state on the client, advances it from the render loop and
 * fans out events and phase changes to React without per-frame renders.
 */
export class GameSession {
  state: GameState;
  private eventListeners = new Set<Listener<GameEvent>>();
  private phaseListeners = new Set<Listener<Phase>>();
  private lastPhase: Phase;

  constructor(seed = (Date.now() % 100000) + 1) {
    this.state = createGame(seed);
    this.lastPhase = this.state.phase;
  }

  reset(seed = (Date.now() % 100000) + 1) {
    this.state = createGame(seed);
    this.emitPhase();
  }

  start() {
    startGame(this.state);
    this.emitPhase();
  }

  pause() {
    pauseGame(this.state);
    this.emitPhase();
  }

  togglePause() {
    togglePause(this.state);
    this.emitPhase();
  }

  left() {
    moveLane(this.state, -1);
  }

  right() {
    moveLane(this.state, 1);
  }

  lane(lane: Lane) {
    setLane(this.state, lane);
  }

  tick(delta: number) {
    step(this.state, delta);
    for (const e of this.state.events) this.eventListeners.forEach((l) => l(e));
    this.emitPhase();
  }

  onEvent(listener: Listener<GameEvent>) {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  onPhase(listener: Listener<Phase>) {
    this.phaseListeners.add(listener);
    return () => {
      this.phaseListeners.delete(listener);
    };
  }

  private emitPhase() {
    if (this.state.phase !== this.lastPhase) {
      this.lastPhase = this.state.phase;
      this.phaseListeners.forEach((l) => l(this.state.phase));
    }
  }
}
