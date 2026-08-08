import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Section({
  id,
  no,
  title,
  children,
}: {
  id: string;
  no: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="section" id={id}>
      <div className="wrap">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="section-head">
            <span className="section-no">{no}</span>
            <h2>{title}</h2>
          </div>
          {children}
        </motion.div>
      </div>
    </section>
  );
}
