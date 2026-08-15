import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Exhibit({
  id,
  no,
  title,
  story,
  footnote,
  children,
}: {
  id: string;
  no: string;
  title: string;
  story: ReactNode;
  footnote: string;
  children: ReactNode;
}) {
  return (
    <motion.article
      className="exhibit"
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <header className="exhibit-head">
        <span className="exhibit-no mono">EXHIBIT {no}</span>
        <h3>{title}</h3>
      </header>
      <p className="exhibit-story">{story}</p>
      {children}
      <p className="exhibit-foot mono">⌗ true story: {footnote}</p>
    </motion.article>
  );
}
