import { useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { Exhibit } from "../components/Exhibit";

type Migration = {
  id: string;
  tab: string;
  fromLabel: string;
  toLabel: string;
  fromIcon: string;
  toIcon: string;
  items: string[];
  stats: { label: string; before: string; after: string }[];
  doneLine: string;
};

const MIGRATIONS: Migration[] = [
  {
    id: "lambda",
    tab: "Serverless → K8s",
    fromLabel: "AWS Lambda",
    toLabel: "EKS",
    fromIcon: "λ",
    toIcon: "☸",
    items: ["ingest", "transform", "enrich", "export", "reconcile", "scheduler"],
    stats: [
      { label: "cold starts", before: "constant", after: "none" },
      { label: "runtime ceiling", before: "15 min", after: "unlimited" },
      { label: "back-pressure", before: "none", after: "handled" },
      { label: "resumable jobs", before: "no", after: "yes" },
    ],
    doneLine: "done — the data service now runs long, streams, and survives its own volume.",
  },
  {
    id: "ec2",
    tab: "EC2 fleet → K8s",
    fromLabel: "EC2 instances",
    toLabel: "Kubernetes",
    fromIcon: "🖥",
    toIcon: "☸",
    items: ["checkout", "search", "auth", "catalog", "orders", "cms"],
    stats: [
      { label: "deploys", before: "slow, manual", after: "minutes, auto" },
      { label: "scaling", before: "by hand", after: "autoscaled" },
      { label: "AWS bill", before: "£££", after: "££" },
      { label: "engineers served", before: "—", after: "300+" },
    ],
    doneLine: "done — 300+ engineers deploy faster and finance sends a thank-you card.",
  },
  {
    id: "sfmc",
    tab: "CRM cutover",
    fromLabel: "Oracle Crowdtwist",
    toLabel: "Salesforce Marketing Cloud",
    fromIcon: "📇",
    toIcon: "☁️",
    items: ["email", "push", "rewards", "journeys", "segments", "receipts"],
    stats: [
      { label: "customers who noticed", before: "at risk", after: "zero" },
      { label: "channels migrated", before: "0", after: "all of them" },
      { label: "engineers led", before: "—", after: "4" },
      { label: "rollback needed", before: "?", after: "never" },
    ],
    doneLine: "done — every channel moved, nobody's inbox noticed a thing.",
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function MigrationMachine() {
  const [tab, setTab] = useState(0);
  const [moved, setMoved] = useState(0);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>(["pick a migration and pull the lever."]);
  const mig = MIGRATIONS[tab];
  const done = moved === mig.items.length;

  const pickTab = (i: number) => {
    if (running) return;
    setTab(i);
    setMoved(0);
    setLog([`loaded: ${MIGRATIONS[i].tab}. pull the lever.`]);
  };

  const run = async () => {
    if (running) return;
    setRunning(true);
    setMoved(0);
    setLog([`beginning ${mig.tab} — traffic stays live the whole time.`]);
    for (let i = 1; i <= mig.items.length; i++) {
      await sleep(620);
      setMoved(i);
      setLog((l) => [...l.slice(-5), `${mig.items[i - 1]} → migrated · traffic shifted · 0 requests dropped`]);
    }
    await sleep(450);
    setLog((l) => [...l.slice(-5), mig.doneLine]);
    setRunning(false);
  };

  return (
    <Exhibit
      id="migrations"
      no="02"
      title="The Migration Machine"
      story={
        <>
          Hard migrations are my favourite kind of boring: months of planning so the moment itself is
          a non-event. Three real ones, replayable — <strong>watch the "requests dropped" counter,
          it's the whole job.</strong>
        </>
      }
      footnote="Lambdas→EKS (2025) · EC2→K8s for a 300+ engineer org at Dyson (2019–20) · LEGO's Crowdtwist→SFMC cutover, zero customer-visible disruption (2021–22)."
    >
      <div className="mig card">
        <div className="mig-tabs">
          {MIGRATIONS.map((m, i) => (
            <button
              key={m.id}
              className={"mig-tab mono" + (i === tab ? " on" : "")}
              onClick={() => pickTab(i)}
              disabled={running}
            >
              {m.tab}
            </button>
          ))}
          <button className="btn btn-accent mig-run" onClick={run} disabled={running}>
            {running ? "Migrating…" : done ? "Run it again" : "⚙ Pull the lever"}
          </button>
        </div>

        <LayoutGroup>
          <div className="mig-stage">
            <div className={"mig-side" + (done ? " drained" : "")}>
              <div className="mig-side-head mono">
                <span className="mig-icon">{mig.fromIcon}</span> {mig.fromLabel}
              </div>
              <div className="mig-bin">
                {mig.items.map(
                  (it, i) =>
                    i >= moved && (
                      <motion.span layoutId={`${mig.id}-${it}`} key={it} className="mig-item">
                        {it}
                      </motion.span>
                    )
                )}
                {done && <span className="mig-empty mono">decommissioned 🪦</span>}
              </div>
            </div>
            <div className="mig-arrow mono">{running ? "▶▶" : "→"}</div>
            <div className="mig-side to">
              <div className="mig-side-head mono">
                <span className="mig-icon">{mig.toIcon}</span> {mig.toLabel}
              </div>
              <div className="mig-bin">
                {mig.items.map(
                  (it, i) =>
                    i < moved && (
                      <motion.span layoutId={`${mig.id}-${it}`} key={it} className="mig-item on">
                        {it}
                      </motion.span>
                    )
                )}
              </div>
            </div>
          </div>
        </LayoutGroup>

        <div className="mig-stats">
          {mig.stats.map((s) => (
            <div className="mig-stat" key={s.label}>
              <span className="mig-stat-label mono">{s.label}</span>
              <span className={"mig-stat-val" + (done ? " good" : "")}>
                {done ? s.after : s.before}
              </span>
            </div>
          ))}
          <div className="mig-stat">
            <span className="mig-stat-label mono">requests dropped</span>
            <span className="mig-stat-val good">0</span>
          </div>
        </div>

        <div className="mig-log mono">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </Exhibit>
  );
}
