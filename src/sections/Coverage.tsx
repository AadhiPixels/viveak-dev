import { useState } from "react";
import { Exhibit } from "../components/Exhibit";

const MILESTONES: Record<number, string> = {
  35: "first suite green. someone frames the screenshot.",
  45: "flaky tests quarantined. sleep quality improves.",
  55: "CI now fails any build that drops coverage. no exceptions. not even yours.",
  65: "the team starts writing tests before the code. suspiciously professional.",
  75: "🏆 75% — target smashed. graduate offer converts to a permanent role.",
  90: "the last few percent are integration tests nobody wants to write. we wrote them.",
};

export function Coverage() {
  const [cov, setCov] = useState(25);
  const [lines, setLines] = useState<string[]>(["inherited: ~25% coverage, morale to match. start clicking."]);
  const [burst, setBurst] = useState(0);

  const write = () => {
    if (cov >= 98) return;
    const next = Math.min(98, cov + 3 + Math.floor(Math.random() * 5));
    for (const m of Object.keys(MILESTONES).map(Number).sort((a, b) => a - b)) {
      if (cov < m && next >= m) {
        setLines((l) => [...l.slice(-4), MILESTONES[m]]);
        if (m === 75) setBurst((b) => b + 1);
      }
    }
    setCov(next);
  };

  const unlocked = cov >= 75;

  return (
    <Exhibit
      id="coverage"
      no="05"
      title="The Coverage Cranker"
      story={
        <>
          My first grown-up job: HMRC's test automation, inherited at ~25% coverage. I cranked it
          past 75% — and it turned a graduate offer into a permanent role.{" "}
          <strong>Recreate the grind, minus the eighteen months:</strong>
        </>
      }
      footnote="HMRC via Accenture (2015–18): automated test coverage from ~25% to 75%+."
    >
      <div className="cov card">
        <div className="cov-row">
          <button className="btn btn-accent" onClick={write} disabled={cov >= 98}>
            {cov >= 98 ? "98% — the last 2% is a lie" : "⌨ Write a test"}
          </button>
          <div className="cov-meter">
            <div className="cov-bar">
              <div className={"cov-fill" + (unlocked ? " gold" : "")} style={{ width: `${cov}%` }} />
              <span className="cov-target mono" style={{ left: "75%" }}>75%<br/>target</span>
            </div>
            <span className="cov-n mono">{cov}%</span>
          </div>
        </div>
        {unlocked && (
          <div className="cov-unlock" key={burst}>
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="confetti"
                style={{
                  left: `${(i * 41) % 100}%`,
                  animationDelay: `${(i % 6) * 0.09}s`,
                  background: ["var(--accent)", "var(--accent-2)", "#ffd447"][i % 3],
                }}
              />
            ))}
            <span className="cov-badge mono">🏆 PERMANENT ROLE UNLOCKED</span>
          </div>
        )}
        <div className="cov-log mono">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </Exhibit>
  );
}
