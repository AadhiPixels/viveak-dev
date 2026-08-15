import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMode } from "../mode";

const DAY_WORDS = ["an event hub", "a migration rig", "a returns robot", "a page factory"];
const NIGHT_WORDS = ["loyalty apps", "marketplaces", "mobile games", "odd prototypes"];

function Rotator({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
    const t = setInterval(() => setIdx((i) => (i + 1) % words.length), 2400);
    return () => clearInterval(t);
  }, [words]);
  return (
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
    </span>
  );
}

export function Hero() {
  const { mode } = useMode();

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
            ? "Viveak Vadivelkarasan · distributed systems · London"
            : "Viveak Vadivelkarasan · AadhiPixels, founder · after hours"}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {mode === "day" ? (
            <>
              Eight years of systems, rebuilt as <Rotator words={DAY_WORDS} />{" "}
              <span className="outline">you can play with.</span>
            </>
          ) : (
            <>
              After dark, I ship <Rotator words={NIGHT_WORDS} />{" "}
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
              This is not a CV with a colour scheme. It's a <strong>playground</strong> — the event
              hub pushing <strong>~1M events a day</strong>, the migrations, LEGO.com's first
              automated returns journey, Dyson's component factory — all rebuilt as working toys.
              Break them. They respawn.
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
          <a className="btn btn-accent" href={mode === "day" ? "#playground" : "#products"}>
            {mode === "day" ? "Enter the playground →" : "See what's live →"}
          </a>
          <a className="btn" href="/cv.pdf" download="Viveak-Vadivelkarasan-CV.pdf">
            The formal version (CV)
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
          {mode === "day" ? "5 playable exhibits" : "Flutter + Firebase"}
        </motion.span>
        <motion.span className="sticker s3" drag dragMomentum={false} whileDrag={{ scale: 1.1 }}>
          {mode === "day" ? "0 requests dropped" : "design-first"}
        </motion.span>
      </div>

      <span className="hero-scroll">scroll ↓ · or press ⌘K</span>
    </section>
  );
}
