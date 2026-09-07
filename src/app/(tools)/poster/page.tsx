import { notFound } from "next/navigation";
import { PosterRenderer } from "./PosterRenderer";

export const metadata = { title: "Poster renderer", robots: { index: false, follow: false } };

/**
 * Renders the signature scene at a fixed progress so the build can capture
 * matching poster images. Disabled in production unless explicitly enabled.
 */
export default async function PosterPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; variant?: string; quality?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.POSTER_ROUTE !== "1") notFound();
  const sp = await searchParams;
  const progress = Math.min(1, Math.max(0, Number(sp.p ?? "0") || 0));
  const variant = sp.variant === "mobile" ? "mobile" : "desktop";
  const quality = sp.quality === "medium" || sp.quality === "low" ? sp.quality : "high";
  return <PosterRenderer progress={progress} variant={variant} quality={quality} />;
}
