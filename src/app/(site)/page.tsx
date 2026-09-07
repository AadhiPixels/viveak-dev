import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { EvidenceChapter } from "@/components/home/EvidenceChapter";
import { WorkChapters } from "@/components/home/WorkChapters";
import { ProductsScene } from "@/components/home/ProductsScene";
import { LabScene } from "@/components/home/LabScene";
import { JourneyScene } from "@/components/home/JourneyScene";
import { ClosingScene } from "@/components/home/ClosingScene";
import { PersonJsonLd } from "@/components/seo/PersonJsonLd";
import { WebSiteJsonLd } from "@/components/seo/WebSiteJsonLd";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <PersonJsonLd />
      <WebSiteJsonLd />
      <Hero />
      <EvidenceChapter />
      <WorkChapters />
      <ProductsScene />
      <LabScene />
      <JourneyScene />
      <ClosingScene />
    </>
  );
}
