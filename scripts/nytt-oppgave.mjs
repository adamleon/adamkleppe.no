#!/usr/bin/env node
/**
 * Henter metadata for en studentoppgave og skriver Markdown-fil til
 * src/content/undervisning/.
 *
 * Støtter:
 *   - NVA (Sikt):    https://nva.sikt.no/registration/<id>
 *                    → henter fra https://api.nva.unit.no/search/resources
 *   - NTNU Open /
 *     DSpace:        https://hdl.handle.net/... eller ntnuopen.ntnu.no
 *                    → skraper citation_* / DC.* meta-tags
 *
 * Bruk:  npm run nytt-oppgave -- <url>
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) {
  console.error("Bruk: npm run nytt-oppgave -- <url>");
  console.error("Støtter NVA (nva.sikt.no) og NTNU Open / DSpace.");
  process.exit(1);
}

const nvaMatch = url.match(/nva\.sikt\.no\/registration\/([^/?#]+)/);

let meta;
try {
  meta = nvaMatch ? await fetchFromNva(nvaMatch[1]) : await fetchFromDspace(url);
} catch (err) {
  console.error(`\nFeilet: ${err.message}`);
  process.exit(1);
}

writeMarkdown(meta);

async function fetchFromNva(id) {
  const apiUrl = `https://api.nva.unit.no/search/resources?id=${encodeURIComponent(id)}`;
  console.log(`Henter fra NVA API (${id}) ...`);

  const res = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "adamkleppe.no/nytt-oppgave",
    },
  });
  if (!res.ok) {
    throw new Error(`NVA API svarte HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const hit = json.hits?.[0];
  if (!hit) {
    throw new Error(
      `Fant ingen treff for id=${id}. Sjekk at lenken er riktig, eller at ` +
        `oppgaven er offentlig publisert i NVA.`,
    );
  }

  const ed = hit.entityDescription ?? {};
  const title = ed.mainTitle;
  if (!title) {
    throw new Error("Fant ikke entityDescription.mainTitle i NVA-responsen.");
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
  const nivå = mapNvaTypeToNivå(type);

  if (!nivå) {
    console.warn(
      `\n  Advarsel: publikasjonstypen "${type}" ser ikke ut som en ` +
        `studentoppgave. Hører den kanskje hjemme i /publikasjoner i stedet?\n`,
    );
  }

  return { title, authors, year, isoDate, nivå, url, sourceType: type };
}

function mapNvaTypeToNivå(type) {
  if (!type) return undefined;
  if (type === "DegreeMaster" || type === "DegreeMasterTwoYear") return "master";
  if (type === "DegreeBachelor") return "bachelor";
  if (type === "DegreePhd" || type === "DegreeLicentiate") return "phd";
  if (type === "OtherStudentWork") return "annet";
  return undefined;
}

async function fetchFromDspace(url) {
  console.log(`Henter ${url} ...`);
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "adamkleppe.no/nytt-oppgave" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  function metaAll(name) {
    const re = new RegExp(
      `<meta\\s+(?:name|property)=["']${name}["']\\s+content=["']([^"']+)["']`,
      "gi",
    );
    const reRev = new RegExp(
      `<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["']${name}["']`,
      "gi",
    );
    return [
      ...new Set(
        [...html.matchAll(re), ...html.matchAll(reRev)].map((m) =>
          decodeEntities(m[1]).trim(),
        ),
      ),
    ];
  }
  const meta = (name) => metaAll(name)[0];

  const title =
    meta("citation_title") ||
    meta("DC.title") ||
    meta("dc.title") ||
    meta("og:title");
  if (!title) {
    throw new Error(
      "Fant ikke tittel i HTML-en. Hvis siden er en JavaScript-app " +
        "(f.eks. DSpace 7) er ikke meta-tags satt. Skriv inn manuelt.",
    );
  }

  const authorsCit = metaAll("citation_author");
  const authorsDc = [...metaAll("DC.creator"), ...metaAll("dc.creator")];
  const authors = authorsCit.length ? authorsCit : [...new Set(authorsDc)];

  const dateRaw =
    meta("citation_publication_date") ||
    meta("citation_date") ||
    meta("DC.date.issued") ||
    meta("dc.date.issued") ||
    meta("DC.date") ||
    meta("dc.date");
  const year = dateRaw
    ? Number(String(dateRaw).slice(0, 4))
    : new Date().getFullYear();
  const isoDate =
    dateRaw && /^\d{4}-\d{2}-\d{2}/.test(dateRaw)
      ? dateRaw.slice(0, 10)
      : `${year}-01-01`;

  const type =
    meta("DC.type") ||
    meta("dc.type") ||
    meta("citation_dissertation_name") ||
    "";
  let nivå;
  if (/master/i.test(type)) nivå = "master";
  else if (/bachelor/i.test(type)) nivå = "bachelor";
  else if (/doktor|phd|dr\.philos/i.test(type)) nivå = "phd";

  return { title, authors, year, isoDate, nivå, url, sourceType: type };
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

function writeMarkdown({ title, authors, year, isoDate, nivå, url, sourceType }) {
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
  lines.push(
    `<!-- Generert ${new Date().toISOString().slice(0, 10)} fra ${url} -->`,
  );
  lines.push("");

  const dir = path.join(process.cwd(), "src", "content", "undervisning");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${slug}.md`);

  if (existsSync(filePath)) {
    throw new Error(`Fil finnes allerede: ${filePath}`);
  }

  writeFileSync(filePath, lines.join("\n") + "\n");

  console.log("");
  console.log(`✓ Skrev ${path.relative(process.cwd(), filePath)}`);
  console.log("");
  console.log(`  Tittel:    ${title}`);
  if (authors.length) console.log(`  Student:   ${authors.join(", ")}`);
  console.log(`  År:        ${year}`);
  if (nivå) console.log(`  Nivå:      ${nivå}`);
  if (sourceType) console.log(`  Type:      ${sourceType}`);
  console.log(`  Lenke:     ${url}`);
}
