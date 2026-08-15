import { Section } from "../components/Section";

const ERAS = [
  {
    years: "2015–17",
    title: "Tutorial levels",
    line: "CS degree in London. Intern-built a market-data platform that traders leaned on during the EU referendum. Decided distributed systems were the good kind of trouble.",
  },
  {
    years: "2017–18",
    title: "The coverage era",
    line: "HMRC test automation: ~25% → 75%+. A graduate offer became a permanent role. (Exhibit 05 is this, minus the meetings.)",
  },
  {
    years: "2018–20",
    title: "The Dyson years",
    line: "Reusable AEM components and build pipelines across the European e-commerce estate — then led EC2 → Kubernetes for a 300+ engineer organisation.",
  },
  {
    years: "2020–22",
    title: "The LEGO years",
    line: "Built LEGO.com's first automated self-returns journey (support contact −30%), then led four engineers through a zero-disruption CRM cutover to Salesforce Marketing Cloud.",
  },
  {
    years: "2023–24",
    title: "The turnaround",
    line: "UK Government: inherited an underperforming delivery team, reset the cadence, shipped the client's first asynchronous service journey.",
  },
  {
    years: "2024–25",
    title: "The data era",
    line: "Led the Databricks Customer Data Platform integration for LEGO.com — one pipeline from everywhere, into Salesforce CRM, back on schedule.",
  },
  {
    years: "2025–now",
    title: "The platform era",
    line: "Tech Lead for External APIs at a global travel-experiences company (which one? the CV knows). Team of 9, five third-party clients, the Event Hub from Exhibit 01, and an AI-accelerated engineering practice.",
  },
];

export function Story() {
  return (
    <Section id="story" no="02" title="The story so far">
      <p className="section-lede">
        Eight years, compressed. The full, formal version — employers, titles, dates —{" "}
        <a href="/cv.pdf" download="Viveak-Vadivelkarasan-CV.pdf">lives in the CV</a>.
      </p>
      <div className="timeline">
        {ERAS.map((e, i) => (
          <article className="era card" key={e.years}>
            <span className="era-no mono">{String(i + 1).padStart(2, "0")}</span>
            <span className="era-years mono">{e.years}</span>
            <h3>{e.title}</h3>
            <p>{e.line}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
