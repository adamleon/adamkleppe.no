#!/usr/bin/env node
/**
 * Henter metadata for en studentoppgave fra NTNU Open (DSpace) og skriver
 * en Markdown-fil til src/content/undervisning/.
 *
 * Bruk:  npm run nytt-oppgave -- <url>
 * Eks:   npm run nytt-oppgave -- https://hdl.handle.net/11250/3088123
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) {
  console.error("Bruk: npm run nytt-oppgave -- <url>");
  console.error("Eks:  npm run nytt-oppgave -- https://hdl.handle.net/11250/3088123");
  process.exit(1);
}

console.log(`Henter ${url} ...`);

let html;
try {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "adamkleppe.no/nytt-oppgave" },
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  html = await res.text();
} catch (err) {
  console.error(`Klarte ikke hente URL: ${err.message}`);
  process.exit(1);
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function metaAll(name) {
  const re = new RegExp(
    `<meta\\s+(?:name|property)=["']${name}["']\\s+content=["']([^"']+)["']`,
    "gi",
  );
  const reReversed = new RegExp(
    `<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["']${name}["']`,
    "gi",
  );
  const found = [
    ...html.matchAll(re),
    ...html.matchAll(reReversed),
  ].map((m) => decodeEntities(m[1]).trim());
  return [...new Set(found)];
}
const meta = (name) => metaAll(name)[0];

const title =
  meta("citation_title") || meta("DC.title") || meta("dc.title") || meta("og:title");
if (!title) {
  console.error("Fant ikke tittel (citation_title / DC.title / og:title) i HTML-en.");
  console.error("Sjekk at URL-en peker til en NTNU Open / DSpace-side.");
  process.exit(1);
}

const authors = (() => {
  const fromCitation = metaAll("citation_author");
  if (fromCitation.length) return fromCitation;
  const fromDc = [...metaAll("DC.creator"), ...metaAll("dc.creator")];
  return [...new Set(fromDc)];
})();

const dateRaw =
  meta("citation_publication_date") ||
  meta("citation_date") ||
  meta("DC.date.issued") ||
  meta("dc.date.issued") ||
  meta("DC.date") ||
  meta("dc.date");

const year = dateRaw ? Number(String(dateRaw).slice(0, 4)) : new Date().getFullYear();
const isoDate = dateRaw && /^\d{4}-\d{2}-\d{2}/.test(dateRaw)
  ? dateRaw.slice(0, 10)
  : `${year}-01-01`;

const type =
  meta("DC.type") || meta("dc.type") || meta("citation_dissertation_name") || "";
let nivå;
if (/master/i.test(type)) nivå = "master";
else if (/bachelor/i.test(type)) nivå = "bachelor";
else if (/doktor|phd|dr\.philos/i.test(type)) nivå = "phd";

function yamlEscape(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const slug = slugify(title) || `oppgave-${year}-${Date.now()}`;

const lines = ["---"];
lines.push(`title: "${yamlEscape(title)}"`);
lines.push(`kind: "studentoppgave"`);
if (nivå) lines.push(`nivå: "${nivå}"`);
lines.push(`pubDate: ${isoDate}`);
lines.push(`år: ${year}`);
if (authors.length) {
  lines.push("student:");
  for (const a of authors) lines.push(`  - "${yamlEscape(a)}"`);
}
lines.push(`url: "${url}"`);
lines.push("tags: []");
lines.push("---");
lines.push("");
lines.push(`<!-- Generert ${new Date().toISOString().slice(0, 10)} fra ${url} -->`);
lines.push("");

const dir = path.join(process.cwd(), "src", "content", "undervisning");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const filePath = path.join(dir, `${slug}.md`);

if (existsSync(filePath)) {
  console.error(`Fil finnes allerede: ${filePath}`);
  console.error("Slett eller endre filen før du kjører på nytt.");
  process.exit(1);
}

writeFileSync(filePath, lines.join("\n") + "\n");

console.log("");
console.log(`✓ Skrev ${path.relative(process.cwd(), filePath)}`);
console.log("");
console.log(`  Tittel:    ${title}`);
if (authors.length) console.log(`  Student:   ${authors.join(", ")}`);
console.log(`  År:        ${year}`);
if (nivå) console.log(`  Nivå:      ${nivå}`);
console.log(`  Lenke:     ${url}`);
