import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Exhibit } from "../components/Exhibit";

const BLOCKS: Record<string, { name: string; bars: number[] }> = {
  hero: { name: "Hero banner", bars: [100, 46] },
  carousel: { name: "Product carousel", bars: [30, 30, 30] },
  specs: { name: "Spec table", bars: [80, 80, 80] },
  reviews: { name: "Reviews", bars: [58, 70, 40] },
  locator: { name: "Store locator", bars: [100, 24] },
};

const STAGES = ["build", "test", "deploy"];
const MARKETS = ["🇬🇧", "🇩🇪", "🇫🇷", "🇮🇹", "🇪🇸", "🇳🇱", "🇵🇱", "🇸🇪", "🇦🇹"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Factory() {
  const [page, setPage] = useState<string[]>([]);
  const [stage, setStage] = useState(-1); // -1 idle, 0..2 running, 3 shipped
  const [markets, setMarkets] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const shipped = stage === STAGES.length;
  const running = stage > -1 && !shipped;

  const add = (key: string) => {
    if (running || page.length >= 6) return;
    if (shipped) { setStage(-1); setMarkets(0); }
    setPage((p) => [...p, key]);
  };

  const reset = () => {
    if (running) return;
    setPage([]);
    setStage(-1);
    setMarkets(0);
  };

  const ship = async () => {
    if (running || page.length === 0) return;
    setMarkets(0);
    for (let i = 0; i < STAGES.length; i++) {
      setStage(i);
      await sleep(650);
      if (!alive.current) return;
    }
    setStage(STAGES.length);
    for (let i = 1; i <= MARKETS.length; i++) {
      await sleep(130);
      if (!alive.current) return;
      setMarkets(i);
    }
  };

  return (
    <Exhibit
      id="factory"
      no="04"
      title="The Component Factory"
      story={
        <>
          At Dyson I built the reusable AEM components — and the build pipelines behind them — that
          powered product pages across the European e-commerce estate. Same idea, toy scale:{" "}
          <strong>assemble a page from the parts bin, then ship it everywhere at once.</strong>
        </>
      }
      footnote="reusable AEM components + build pipelines rolled out across Dyson's European e-commerce estate (2018–19)."
    >
      <div className="factory card">
        <div className="factory-cols">
          <div className="factory-bin">
            <div className="factory-label mono">PARTS BIN</div>
            {Object.entries(BLOCKS).map(([key, b]) => (
              <button key={key} className="factory-part" onClick={() => add(key)} disabled={running || page.length >= 6}>
                + {b.name}
              </button>
            ))}
            <div className="factory-actions">
              <button className="btn btn-accent" onClick={ship} disabled={running || page.length === 0}>
                {running ? "Shipping…" : "🚀 Ship to Europe"}
              </button>
              <button className="btn" onClick={reset} disabled={running || page.length === 0}>
                Scrap it
              </button>
            </div>
          </div>

          <div className="factory-canvas">
            <div className="factory-label mono">PAGE.HTML {shipped && "· LIVE IN " + markets + " MARKETS"}</div>
            <div className={"factory-page" + (shipped ? " live" : "")}>
              <AnimatePresence>
                {page.length === 0 && (
                  <motion.div className="factory-empty mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    an empty page. add components →
                  </motion.div>
                )}
                {page.map((key, i) => (
                  <motion.div
                    key={i + key}
                    className="factory-block"
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="factory-block-name mono">{BLOCKS[key].name}</span>
                    <div className="factory-bars">
                      {BLOCKS[key].bars.map((w, j) => (
                        <span key={j} style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="factory-pipeline mono">
              {STAGES.map((s, i) => (
                <span key={s} className={"factory-stage" + (stage > i ? " ok" : stage === i ? " busy" : "")}>
                  {stage > i ? "✓" : stage === i ? "◌" : "·"} {s}
                </span>
              ))}
              <span className="factory-flags">
                {MARKETS.slice(0, markets).map((f, i) => (
                  <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}>{f}</motion.span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Exhibit>
  );
}
