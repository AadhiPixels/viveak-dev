import localFont from "next/font/local";

/**
 * Self-hosted, OFL-licensed variable fonts (licences alongside the files), subset to
 * Latin plus the punctuation, currency, arrow and mathematical symbols the site uses
 * (pyftsubset; the full families are on GitHub if more scripts are ever needed).
 * Inter Tight for monumental display type, Geist Sans for body and UI,
 * Geist Mono for small technical labels.
 */

export const display = localFont({
  src: "./fonts/InterTight-Variable-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-display",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

export const sans = localFont({
  src: "./fonts/Geist-Variable-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

export const mono = localFont({
  src: "./fonts/GeistMono-Variable-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-mono",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
