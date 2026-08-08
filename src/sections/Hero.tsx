import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMode } from "../mode";

const DAY_WORDS = ["API platforms", "webhook pipelines", "event backbones", "K8s migrations"];
const NIGHT_WORDS = ["loyalty apps", "marketplaces", "mobile games", "odd prototypes"];

export function Hero() {
  const { mode } = useMode();
  const words = mode === "day" ? DAY_WORDS : NIGHT_WORDS;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    const t = setInterval(() => setIdx((i) => (i + 1) % words.length), 2400);
    return () => clearInterval(t);
  }, [mode, words.length]);

  return (
    <section className="hero" id="top">
      <div className="wrap" style={{ position: "relative", width: "100%" }}>
        <motion.p
          className="hero-eyebrow"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {mode === "day"
            ? "Viveak Vadivelkarasan · Tech Lead · London"
            : "Viveak Vadivelkarasan · AadhiPixels, founder · after hours"}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {mode === "day" ? (
            <>
              I build the{" "}
              <span style={{ whiteSpace: "nowrap" }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={words[idx]}
                    className="accent-word"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.25 }}
                  >
                    {words[idx]}
                  </motion.span>
                </AnimatePresence>
              </span>{" "}
              other companies <span className="outline">build on.</span>
            </>
          ) : (
            <>
              After dark, I ship{" "}
              <span style={{ whiteSpace: "nowrap" }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={words[idx]}
                    className="accent-word"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.25 }}
                  >
                    {words[idx]}
                  </motion.span>
                </AnimatePresence>
              </span>{" "}
              <span className="outline">of my own.</span>
            </>
          )}
        </motion.h1>

        <motion.p
          className="hero-sub"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          {mode === "day" ? (
            <>
              Tech Lead for External APIs at Collinson — <strong>9 engineers</strong>, an integration
              platform serving <strong>5 major third-party clients</strong>, and a webhook delivery
              backbone pushing <strong>~1M events a day</strong>. 8+ years of distributed systems and
              hard migrations done well.
            </>
          ) : (
            <>
              I run <strong>AadhiPixels</strong>, a one-person product studio. Design, build, deploy,
              operate — <strong>real users, real payments</strong>, and I'm the on-call rota.
              Three products live right now; a shelf of prototypes behind them.
            </>
          )}
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <a className="btn btn-accent" href="#demo">
            {mode === "day" ? "Break my webhook platform →" : "See what's live →"}
          </a>
          <a className="btn" href="/cv.pdf" download="Viveak-Vadivelkarasan-CV.pdf">
            Grab the CV
          </a>
        </motion.div>

        <motion.span
          className="sticker s1"
          drag
          dragMomentum={false}
          whileDrag={{ scale: 1.1, cursor: "grabbing" }}
          title="Yes, you can drag these"
        >
          {mode === "day" ? "~1M events/day" : "0 → shipped, solo"}
        </motion.span>
        <motion.span className="sticker s2" drag dragMomentum={false} whileDrag={{ scale: 1.1 }}>
          {mode === "day" ? "AWS certified" : "Flutter + Firebase"}
        </motion.span>
        <motion.span className="sticker s3" drag dragMomentum={false} whileDrag={{ scale: 1.1 }}>
          {mode === "day" ? "AI-accelerated" : "design-first"}
        </motion.span>
      </div>

      <span className="hero-scroll">scroll ↓ · or press ⌘K</span>
    </section>
  );
}
