#!/usr/bin/env node
/**
 * Henter alle dine publikasjoner (artikler, konferansebidrag, bøker,
 * bokkapitler) fra NVA og skriver én Markdown-fil per publikasjon til
 * src/content/publikasjoner/.
 *
 * Bruk:
 *   npm run hent-publikasjoner
 *   npm run hent-publikasjoner -- "Annet Navn"
 *
 * Eksisterende filer overskrives ikke — scriptet er idempotent.
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_NAME = "Adam Leon Kleppe";
const navn = process.argv[2] || DEFAULT_NAME;
const PAGE_SIZE = 100;
const API_BASE = "https://api.nva.unit.no/search/resources";

const ARTIKKEL_TYPER = [
  "AcademicArticle",
  "JournalArticle",
  "ScientificArticle",
  "PopularScienceArticle",
  "FeatureArticle",
  "JournalLeader",
  "JournalLetter",
  "JournalReview",
  "ProfessionalArticle",
];
const KONFERANSE_TYPER = [
  "ConferenceLecture",
  "ConferencePoster",
  "ConferenceAbstract",
  "ConferencePaper",
];
const BOK_TYPER = [
  "AcademicMonograph",
  "NonFictionMonograph",
  "PopularScienceMonograph",
  "Textbook",
  "Encyclopedia",
  "ExhibitionCatalog",
  "Anthology",
];
const BOKKAPITTEL_TYPER = [
  "AcademicChapter",
  "NonFictionChapter",
  "PopularScienceChapter",
  "ChapterArticle",
  "BookAnthologyChapter",
  "TextbookChapter",
  "EncyclopediaChapter",
];

const ALLE_TYPER = [
  ...ARTIKKEL_TYPER,
  ...KONFERANSE_TYPER,
  ...BOK_TYPER,
  ...BOKKAPITTEL_TYPER,
];

const SUPERVISOR_ROLES = new Set([
  "Supervisor",
  "Advisor",
  "AcademicCoordinator",
]);

const contentDir = path.join(process.cwd(), "src", "content", "publikasjoner");
if (!existsSync(contentDir)) mkdirSync(contentDir, { recursive: true });

console.log(
  `Søker NVA etter publikasjoner med kontributør "${navn}" ` +
    `(artikler, konferansebidrag, bøker, kapitler) ...\n`,
);

let from = 0;
let totalHits;
let written = 0;
let skipped = 0;
let droppedRole = 0;
let droppedSnl = 0;
let warnings = 0;

while (true) {
  const params = new URLSearchParams({
    contributor_name: navn,
    category: ALLE_TYPER.join(","),
    status: "PUBLISHED",
    size: String(PAGE_SIZE),
    from: String(from),
    sort: "publication_date:desc",
  });
  const url = `${API_BASE}?${params}`;

  let json;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "adamkleppe.no/hent-publikasjoner",
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
    else if (result === "dropped-role") droppedRole++;
    else if (result === "dropped-snl") droppedSnl++;
    else if (result === "warning") warnings++;
  }

  from += hits.length;
  if (from >= totalHits) break;
  if (hits.length < PAGE_SIZE) break;
}

console.log("");
console.log("Sammendrag:");
console.log(`  ${written} ny${written === 1 ? "" : "e"} skrevet`);
console.log(`  ${skipped} hoppet over (fanns fra før)`);
if (droppedRole)
  console.log(`  ${droppedRole} hvor du kun har veileder-/redaktørrolle`);
if (droppedSnl)
  console.log(`  ${droppedSnl} SNL-artikler (hører hjemme i /formidling)`);
if (warnings) console.log(`  ${warnings} advarsler — sjekk loggen over`);

function writeHit(hit) {
  const ed = hit.entityDescription ?? {};
  const title = ed.mainTitle;
  const id = hit.identifier ?? extractIdFromUrl(hit.id);

  if (!title) {
    console.warn(`  ! Hoppet over treff uten tittel (id=${id ?? "?"})`);
    return "warning";
  }

  const allContributors = ed.contributors ?? [];
  const selfContributor = allContributors.find((c) =>
    isSearchedName(c.identity?.name, navn),
  );
  const selfRole = selfContributor?.role?.type;

  if (selfRole && SUPERVISOR_ROLES.has(selfRole)) {
    console.log(`  - dropper (kun veileder, ikke forfatter): ${title}`);
    return "dropped-role";
  }

  if (isSnlPublication(ed)) {
    console.log(`  - dropper (SNL-artikkel): ${title}`);
    return "dropped-snl";
  }

  const forfattere = allContributors
    .filter((c) => !SUPERVISOR_ROLES.has(c.role?.type))
    .map((c) => c.identity?.name)
    .filter(Boolean);

  const dateObj = ed.publicationDate ?? {};
  const year = dateObj.year ? Number(dateObj.year) : new Date().getFullYear();

  const instanceType = ed.reference?.publicationInstance?.type ?? "";
  const type = mapType(instanceType);

  const context = ed.reference?.publicationContext ?? {};
  const publisertI = context.title ?? context.name ?? undefined;

  const doiRaw = ed.reference?.doi;
  const doi = doiRaw ? doiRaw.replace(/^https?:\/\/(dx\.)?doi\.org\//, "") : undefined;

  const abstractRaw = ed.abstract;
  const sammendrag = abstractRaw
    ? abstractRaw.replace(/\s+/g, " ").trim()
    : undefined;

  const sourceUrl = id
    ? `https://nva.sikt.no/registration/${id}`
    : (hit.id ?? "");

  const slug =
    slugify(`${year}-${title}`) ||
    `pub-${year}-${(id ?? "").slice(0, 8) || Date.now()}`;
  const filePath = path.join(contentDir, `${slug}.md`);

  if (existsSync(filePath)) {
    console.log(`  - hopper over: ${slug}`);
    return "skipped";
  }

  const lines = ["---"];
  lines.push(`title: "${yamlEscape(title)}"`);
  lines.push(`år: ${year}`);
  lines.push(`type: "${type}"`);
  if (forfattere.length) {
    lines.push("forfattere:");
    for (const a of forfattere) lines.push(`  - "${yamlEscape(a)}"`);
  } else {
    lines.push(`forfattere: []`);
  }
  if (publisertI) lines.push(`publisert_i: "${yamlEscape(publisertI)}"`);
  if (doi) lines.push(`doi: "${yamlEscape(doi)}"`);
  if (sourceUrl) lines.push(`url: "${sourceUrl}"`);
  if (sammendrag) lines.push(`sammendrag: "${yamlEscape(sammendrag)}"`);
  lines.push("---");
  lines.push("");
  lines.push(
    `<!-- Generert ${new Date().toISOString().slice(0, 10)} via hent-publikasjoner (${instanceType}) -->`,
  );
  lines.push("");

  writeFileSync(filePath, lines.join("\n") + "\n");
  console.log(`  ✓ skrev:        ${slug} (${type})`);
  return "written";
}

function isSnlPublication(entityDescription) {
  const ref = entityDescription?.reference ?? {};
  const ctx = ref.publicationContext ?? {};

  const candidates = [
    ctx.title,
    ctx.name,
    ctx.publisher?.name,
    ctx.publisher?.title,
    ctx.entityDescription?.mainTitle,
    ctx.series?.title,
    ctx.series?.name,
  ].filter(Boolean);

  const haystack = candidates.join(" | ").toLowerCase();
  return (
    haystack.includes("store norske leksikon") ||
    /\bsnl\b/.test(haystack) ||
    haystack.includes("snl.no")
  );
}

function mapType(instanceType) {
  if (ARTIKKEL_TYPER.includes(instanceType)) return "artikkel";
  if (KONFERANSE_TYPER.includes(instanceType)) return "konferanse";
  if (BOK_TYPER.includes(instanceType)) return "bok";
  if (BOKKAPITTEL_TYPER.includes(instanceType)) return "bokkapittel";
  return "annet";
}

function isSearchedName(candidate, searched) {
  if (!candidate || !searched) return false;
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  const candTokens = new Set(norm(candidate));
  const searchTokens = norm(searched);
  if (searchTokens.length === 0) return false;
  return searchTokens.every((t) => candTokens.has(t));
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
    .slice(0, 100);
}

function yamlEscape(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
