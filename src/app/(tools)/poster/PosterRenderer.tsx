"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Quality, Variant } from "@/components/scene/compositions";
import { setHeroProgress, setHeroVariant } from "@/components/scene/progress";

const SignatureScene = dynamic(() => import("@/components/scene/SignatureScene"), { ssr: false });

export function PosterRenderer({
  progress,
  variant,
  quality,
}: {
  progress: number;
  variant: Variant;
  quality: Quality;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setHeroVariant(variant);
    setHeroProgress(progress);
  }, [variant, progress]);
  return (
    <div
      className="stage-backdrop fixed inset-0 overflow-hidden"
      data-poster-ready={ready ? "true" : undefined}
      data-variant={variant}
    >
      <SignatureScene
        quality={quality}
        active={false}
        ambient={false}
        fixedProgress={progress}
        onReady={() => window.setTimeout(() => setReady(true), 1200)}
      />
    </div>
  );
}
