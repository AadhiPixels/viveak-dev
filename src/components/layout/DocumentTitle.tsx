"use client";

import { useEffect } from "react";

/** Sets the tab title from the client for routes that cannot export metadata (the root 404). */
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
  return null;
}
