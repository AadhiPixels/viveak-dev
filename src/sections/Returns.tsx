import { useEffect, useRef, useState } from "react";
import { Exhibit } from "../components/Exhibit";

const STEPS = [
  { icon: "🏴‍☠️", text: "A pirate ship arrives with a missing mast. Tragedy." },
  { icon: "🖱️", text: "Customer starts a return on LEGO.com — no phone call, no email, no queue." },
  { icon: "🏷️", text: "The journey generates a label and QR code instantly." },
  { icon: "📦", text: "Carrier scan comes in — an event, naturally — and triggers the refund." },
  { icon: "🎉", text: "Refund lands. Zero humans were involved. The mast is still missing, but morale is restored." },
];

export function Returns() {
  const [step, setStep] = useState(-1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const complete = step >= STEPS.length - 1;

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const start = () => {
    if (timer.current) clearInterval(timer.current);
    setStep(0);
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= STEPS.length - 1) {
          if (timer.current) clearInterval(timer.current);
          return s;
        }
        return s + 1;
      });
    }, 1100);
  };

  const pct = step <= 0 ? 0 : (step / (STEPS.length - 1)) * 100;

  return (
    <Exhibit
      id="returns"
      no="03"
      title="The Returns Robot"
      story={
        <>
          LEGO.com's first automated self-returns journey — the whole flow, no humans in the loop.
          Before this, every broken pirate ship meant a phone call. <strong>After it, support
          contact fell ~30%.</strong> Run a return:
        </>
      }
      footnote="shipped on LEGO.com (2020–21), AWS event-driven end to end. Customer-service contact volume down ~30%."
    >
      <div className="ret card">
        <div className="ret-controls">
          <button className="btn btn-accent" onClick={start} disabled={step > -1 && !complete}>
            {step === -1 ? "🧱 My pirate ship is broken →" : complete ? "Break another one" : "Returning…"}
          </button>
          {complete && (
            <span className="ret-badge mono">☎ phone calls made: 0 · support contact: −30%</span>
          )}
        </div>

        <div className="ret-track">
          <div className="ret-line">
            <div className="ret-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="ret-parcel" style={{ left: `${pct}%` }} aria-hidden="true">
            {complete ? "🎉" : "📦"}
          </span>
        </div>

        <ol className="ret-steps">
          {STEPS.map((s, i) => (
            <li
              key={i}
              className={i === step ? "active" : i < step ? "done" : ""}
            >
              <span className="ret-icon">{s.icon}</span>
              <span>{s.text}</span>
              {i < step && <span className="ret-check mono">✓</span>}
            </li>
          ))}
        </ol>
      </div>
    </Exhibit>
  );
}
