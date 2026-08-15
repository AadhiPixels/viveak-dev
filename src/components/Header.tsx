import { useMode } from "../mode";
import { useToast } from "../toast";

export function Header({ openPalette }: { openPalette: () => void }) {
  const { mode, toggle } = useMode();
  const toast = useToast();

  const onToggle = () => {
    toggle();
    toast(mode === "day" ? "🌙 Clocking off. Welcome to the night shift." : "☀️ Back on the clock.");
  };

  return (
    <header className="header">
      <div className="wrap">
        <a className="logo" href="#top" aria-label="Home">VV</a>
        <nav className="nav">
          <a href="#playground">Playground</a>
          <a href="#story">Story</a>
          <a href="#products">Night shift</a>
          <a href="#skills">Loadout</a>
          <a href="#contact">Hire</a>
        </nav>
        <button className="kbd-hint" onClick={openPalette} title="Command palette">⌘K</button>
        <button
          className="mode-switch"
          onClick={onToggle}
          aria-label={`Switch to ${mode === "day" ? "night" : "day"} mode`}
        >
          <span className={mode === "day" ? "on" : ""}>DAY JOB</span>
          <span className={mode === "night" ? "on" : ""}>NIGHT SHIFT</span>
        </button>
      </div>
    </header>
  );
}
