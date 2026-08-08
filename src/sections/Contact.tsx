import { Section } from "../components/Section";

export function Contact() {
  return (
    <Section id="contact" no="05" title="Two ways to hire me">
      <div className="contact-grid">
        <div className="contact-card card">
          <h3>The full-time way</h3>
          <p>
            Lead / Principal Engineer roles: owning architecture and delivery for distributed
            backend platforms and external API estates, growing teams, and making hard migrations
            look boring — which is the goal.
          </p>
          <a className="btn btn-accent" href="mailto:viveak.03@gmail.com?subject=Lead%2FPrincipal%20role">
            Talk full-time →
          </a>
        </div>
        <div className="contact-card card">
          <h3>The fractional way</h3>
          <p>
            Contract and part-time engagements: architecture reviews for external-facing APIs,
            integration strategy, platform audits, migration plans — or an end-to-end product build.
            I ship my own products solo; I can ship yours.
          </p>
          <a className="btn btn-accent" href="mailto:viveak.03@gmail.com?subject=Fractional%20%2F%20contract">
            Talk contract →
          </a>
        </div>
      </div>

      <a className="big-email" href="mailto:viveak.03@gmail.com">viveak.03@gmail.com</a>

      <div className="contact-links">
        <a href="https://linkedin.com/in/viveakv" target="_blank" rel="noopener">LinkedIn</a>
        <a href="/cv.pdf" download="Viveak-Vadivelkarasan-CV.pdf">CV (PDF)</a>
        <a href="https://github.com/AadhiPixels/viveak-dev" target="_blank" rel="noopener">This site's source</a>
        <span>· London, UK</span>
      </div>
    </Section>
  );
}
