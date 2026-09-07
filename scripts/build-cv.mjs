/**
 * Builds public/Viveak-Vadivelkarasan-CV.pdf from cv/index.html with Playwright's
 * bundled Chromium. Fails when the source breaks a CV rule: more than two pages,
 * an em or en dash, or the current employer's name.
 *
 *   node scripts/build-cv.mjs            # writes the PDF
 *   node scripts/build-cv.mjs --check    # renders to a temp file and only validates
 */
import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const METADATA = {
  Title: "Viveak Vadivelkarasan CV",
  Author: "Viveak Vadivelkarasan",
  Subject: "CV: Tech Lead, Distributed Systems, External API Platforms, AWS & Kubernetes",
  Keywords: "Tech Lead Staff Engineer Distributed Systems External APIs AWS Kubernetes London",
  Creator: "cv/index.html + cv/styles.css (scripts/build-cv.mjs)",
  Producer: "Chromium (Playwright)",
};

/**
 * Chromium only writes the document title into the PDF's Info dictionary. This
 * appends a standard incremental update that replaces the Info object with the
 * full set above, without touching the page content or needing a PDF library.
 */
function withMetadata(pdf) {
  const text = pdf.toString("latin1");
  const trailer = text.slice(text.lastIndexOf("trailer"));
  const size = /\/Size (\d+)/.exec(trailer)?.[1];
  const root = /\/Root (\d+ \d+ R)/.exec(trailer)?.[1];
  const info = /\/Info (\d+) 0 R/.exec(trailer)?.[1];
  const startxref = /startxref\s+(\d+)/.exec(trailer)?.[1];
  const dates = /\/CreationDate \(([^)]+)\)/.exec(text)?.[1];
  if (!size || !root || !info || !startxref) fail("unexpected PDF trailer; metadata not written");

  const escape = (value) => value.replace(/[\\()]/g, (c) => `\\${c}`);
  const entries = Object.entries(METADATA).map(([key, value]) => `/${key} (${escape(value)})`);
  if (dates) entries.push(`/CreationDate (${dates})`, `/ModDate (${dates})`);
  const object = `${info} 0 obj\n<<${entries.join("\n")}>>\nendobj\n`;

  const base = pdf.length + 1; // one newline before the appended object
  const xref = `xref\n0 1\n0000000000 65535 f \n${info} 1\n${String(base).padStart(10, "0")} 00000 n \n`;
  const update = `\n${object}${xref}trailer\n<</Size ${size}\n/Root ${root}\n/Info ${info} 0 R\n/Prev ${startxref}>>\nstartxref\n${base + object.length}\n%%EOF\n`;
  return Buffer.concat([pdf, Buffer.from(update, "latin1")]);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "cv", "index.html");
const outFlag = process.argv.indexOf("--out");
const target =
  outFlag !== -1 && process.argv[outFlag + 1]
    ? path.resolve(process.argv[outFlag + 1])
    : path.join(root, "public", "Viveak-Vadivelkarasan-CV.pdf");
const checkOnly = process.argv.includes("--check");

/**
 * SHA-256 digests of lower-cased words that must not appear in the CV (the
 * current employer's name, which is withheld everywhere in this repository,
 * including here). To add one: printf 'word' | sha256sum
 */
const WITHHELD_DIGESTS = new Set(["5b4a3fa8adeb5cf6348e447b55b72976b89137cba2f6c8cdf873869463557ff4"]);
const digest = (word) => createHash("sha256").update(word.toLowerCase()).digest("hex");

function fail(message) {
  console.error(`cv: ${message}`);
  process.exit(1);
}

const html = await readFile(source, "utf8");
for (const [name, pattern] of [
  ["em dash", /—/],
  ["en dash", /–/],
]) {
  if (pattern.test(html)) fail(`${name} found in cv/index.html; use a plain hyphen or a middle dot`);
}
for (const word of new Set(html.match(/[A-Za-z]+/g) ?? [])) {
  if (WITHHELD_DIGESTS.has(digest(word))) fail(`a withheld name appears in cv/index.html (${word})`);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(source).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });

  const outFile = checkOnly ? path.join(await mkdtemp(path.join(tmpdir(), "cv-")), "cv.pdf") : target;
  const rendered = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });

  // Chromium writes plain page objects, so counting them is reliable here.
  const pages = (rendered.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
  if (pages !== 2) fail(`expected exactly 2 pages, got ${pages}`);

  const pdf = withMetadata(rendered);
  await writeFile(outFile, pdf);

  const text = await page.evaluate(() => document.body.innerText);
  const words = text.split(/\s+/).filter(Boolean).length;
  console.log(
    `cv: ${checkOnly ? "validated" : "wrote"} ${path.relative(root, outFile)} (${pages} pages, ${(pdf.length / 1024).toFixed(0)} KB, ${words} words)`,
  );
} finally {
  await browser.close();
}
