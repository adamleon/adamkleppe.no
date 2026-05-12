#!/usr/bin/env node
/**
 * Henter alle master- og bacheloroppgaver fra NVA hvor et gitt navn er
 * registrert som kontributør (typisk veileder).
 *
 * Bruk:
 *   npm run hent-oppgaver
 *   npm run hent-oppgaver -- "Annet Navn"
 *
 * Filer skrives til src/content/undervisning/. Eksisterende filer blir
 * IKKE overskrevet — scriptet er idempotent og trygt å kjøre flere ganger.
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_NAME = "Adam Leon Kleppe";
const navn = process.argv[2] || DEFAULT_NAME;
const PAGE_SIZE = 100;
const API_BASE = "https://api.nva.unit.no/search/resources";

const contentDir = path.join(process.cwd(), "src", "content", "undervisning");
if (!existsSync(contentDir)) mkdirSync(contentDir, { recursive: true });

console.log(
  `Søker NVA etter master/bachelor-oppgaver med kontributør "${navn}" ...\n`,
);

let from = 0;
let totalHits;
let written = 0;
let skipped = 0;
let warnings = 0;

while (true) {
  const params = new URLSearchParams({
    contributor_name: navn,
    category: "DegreeMaster,DegreeMasterTwoYear,DegreeBachelor",
    size: String(PAGE_SIZE),
    from: String(from),
    sort: "publicationDate.year:desc",
  });
  const url = `${API_BASE}?${params}`;

  let json;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "adamkleppe.no/hent-oppgaver",
      },
    });
    if (!res.ok) {
      console.error(`NVA API svarte HTTP ${res.status} ${res.statusText}`);
      console.error(`URL: ${url}`);
      process.exit(1);
    }
    json = await res.json();
  } catch (err) {
    console.error(`Klarte ikke kalle NVA API: ${err.message}`);
    process.exit(1);
  }

  if (totalHits === undefined) {
    totalHits = json.totalHits ?? json.total ?? 0;
    console.log(`Fant ${totalHits} treff totalt.\n`);
    if (totalHits === 0) break;
  }

  const hits = json.hits ?? [];
  if (hits.length === 0) break;

  for (const hit of hits) {
    const result = writeHit(hit);
    if (result === "written") written++;
    else if (result === "skipped") skipped++;
    else if (result === "warning") warnings++;
  }

  from += hits.length;
  if (from >= totalHits) break;
  if (hits.length < PAGE_SIZE) break;
}

console.log("");
console.log(
  `Sammendrag: ${written} ny${written === 1 ? "" : "e"} skrevet, ` +
    `${skipped} hoppet over.`,
);
if (warnings) {
  console.log(`${warnings} advarsler — sjekk loggen over.`);
}

function writeHit(hit) {
  const ed = hit.entityDescription ?? {};
  const title = ed.mainTitle;
  const id = hit.identifier ?? extractIdFromUrl(hit.id);

  if (!title) {
    console.warn(`  ! Hoppet over treff uten tittel (id=${id ?? "?"})`);
    return "warning";
  }

  const authors = (ed.contributors ?? [])
    .map((c) => c.identity?.name)
    .filter(Boolean);

  const dateObj = ed.publicationDate ?? {};
  const year = dateObj.year ? Number(dateObj.year) : new Date().getFullYear();
  const month = (dateObj.month ?? "01").toString().padStart(2, "0");
  const day = (dateObj.day ?? "01").toString().padStart(2, "0");
  const isoDate = `${year}-${month}-${day}`;

  const type = ed.reference?.publicationInstance?.type ?? "";
  const nivå = mapType(type);

  const sourceUrl = id
    ? `https://nva.sikt.no/registration/${id}`
    : (hit.id ?? "");

  const slug =
    slugify(title) || `oppgave-${year}-${(id ?? "").slice(0, 8) || Date.now()}`;
  const filePath = path.join(contentDir, `${slug}.md`);

  if (existsSync(filePath)) {
    console.log(`  - hopper over: ${slug} (${year})`);
    return "skipped";
  }

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
  lines.push(`url: "${sourceUrl}"`);
  lines.push("tags: []");
  lines.push("---");
  lines.push("");
  lines.push(
    `<!-- Generert ${new Date().toISOString().slice(0, 10)} via hent-oppgaver -->`,
  );
  lines.push("");

  writeFileSync(filePath, lines.join("\n") + "\n");
  console.log(`  ✓ skrev:        ${slug} (${year}${nivå ? `, ${nivå}` : ""})`);
  return "written";
}

function mapType(type) {
  if (type === "DegreeMaster" || type === "DegreeMasterTwoYear") return "master";
  if (type === "DegreeBachelor") return "bachelor";
  if (type === "DegreePhd" || type === "DegreeLicentiate") return "phd";
  if (type === "OtherStudentWork") return "annet";
  return undefined;
}

function extractIdFromUrl(url) {
  if (!url || typeof url !== "string") return undefined;
  const m = url.match(/\/publication\/([^/?#]+)/);
  return m?.[1];
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

function yamlEscape(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
