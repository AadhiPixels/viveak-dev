import { Section } from "../components/Section";
import { Simulator } from "./Simulator";
import { MigrationMachine } from "./MigrationMachine";
import { Returns } from "./Returns";
import { Factory } from "./Factory";
import { Coverage } from "./Coverage";

export function Playground() {
  return (
    <Section id="playground" no="01" title="The playground">
      <p className="section-lede">
        Most portfolios <em>tell</em> you what someone built. This one lets you{" "}
        <strong>operate it</strong>. Five real things I've shipped over eight years, rebuilt as
        working toys — the engineering is faithful, the stakes are not. Employer names for current
        work stay in the <a href="/cv.pdf">CV</a>; everything else is fair game.
      </p>
      <div className="exhibit-list">
        <Simulator />
        <MigrationMachine />
        <Returns />
        <Factory />
        <Coverage />
      </div>
    </Section>
  );
}
