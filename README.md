# adamkleppe.no

Personlig nettside for Adam Leon Kleppe — førsteamanuensis i industrirobotikk
ved NTNU Ålesund. Bygd som en statisk side med Astro + Tailwind. Innhold
ligger i Markdown.

## Tech stack

- **[Astro 4](https://astro.build/)** — statisk site-generator
- **[Tailwind CSS](https://tailwindcss.com/)** — styling
- **Content collections** med type-sjekket frontmatter
- **MDX-støtte** (`@astrojs/mdx`) for rikere blogginnlegg ved behov
- **Sitemap + dobbel RSS-feed** (`/rss-skriv.xml`, `/rss-undervisning.xml`)
- **TypeScript** i strict-modus

Ingen JavaScript-runtime i nettleseren. Mørk/lys-modus følger systemet
(`prefers-color-scheme`); ingen toggle.

## Kjøre lokalt

```bash
npm install
npm run dev      # http://localhost:4321
```

Andre kommandoer:

```bash
npm run build    # bygger til ./dist/ (inkluderer astro check)
npm run preview  # serverer ./dist/
```

## Mappestruktur

```
src/
├── components/      # Astro-komponenter (header, footer, kort, SEO-meta)
├── content/         # Markdown-innhold (en mappe per collection)
│   ├── skriv/
│   ├── forskning/
│   ├── publikasjoner/
│   ├── undervisning/
│   ├── formidling/
│   └── config.ts    # zod-schemaer for hver collection
├── data/
│   └── publications.bib  # tom; planlagt brukt i v2
├── layouts/         # BaseLayout (med <head>+meta) og ProseLayout (Markdown)
├── pages/           # ruter — én fil per side, [slug] for dynamiske
├── styles/global.css
public/              # statiske filer (favicon, OG-bilde, robots.txt)
astro.config.mjs
tailwind.config.mjs
```

## Legge til innhold

Alt innhold er Markdown-filer med YAML-frontmatter i `src/content/<collection>/`.
Frontmatter-schemaene står i `src/content/config.ts`. Astro feiler bygget
hvis frontmatter mangler felter eller har feil type — det er funksjonen.

### Nytt blogginnlegg

Legg en fil i `src/content/skriv/min-tittel.md`:

```markdown
---
title: "Min tittel"
description: "Kort beskrivelse vises i lister og som meta-tag."
pubDate: 2026-05-12
tags: ["robotikk", "sim-to-real"]
draft: false
---

Tekst her. Markdown og MDX støttes.
```

`draft: true` skjuler innlegget fra lister, RSS og sitemap.

### Ny publikasjon

Legg en fil i `src/content/publikasjoner/<slug>.md`:

```markdown
---
title: "Tittel på publikasjonen"
forfattere: ["Adam Leon Kleppe", "Medforfatter"]
år: 2026
type: "artikkel"
publisert_i: "Journal of Whatever"
doi: "10.1234/example"
url: "https://..."
---

Sammendrag.
```

### Nytt emne eller ressurs

`src/content/undervisning/<slug>.md` med `kind: emne` eller `kind: ressurs`.
Disse får hver sin side på `/undervisning/<slug>/`.

### Ny veiledet studentoppgave (fra NVA eller NTNU Open)

Bruk det innebygde scriptet — det fetcher metadata og skriver
Markdown-filen for deg. Støtter både NVA (Sikt) og eldre NTNU Open-poster:

```bash
# NVA (Sikt) — kaller https://api.nva.unit.no/search/resources
npm run nytt-oppgave -- https://nva.sikt.no/registration/<id>

# NTNU Open / DSpace — skraper meta-tags fra HTML
npm run nytt-oppgave -- https://hdl.handle.net/11250/3088123
```

For NVA henter scriptet `entityDescription.mainTitle`, kontributørnavn,
publiseringsdato og publikasjonstype (`DegreeMaster` → master,
`DegreeBachelor` → bachelor, `DegreePhd` → phd, osv.) via det offentlige
søke-API-et. Ingen autentisering nødvendig så lenge oppgaven er publisert.

For NTNU Open-poster som fortsatt ligger i gamle DSpace, leser scriptet
`citation_*` og `DC.*` meta-tags fra HTML-en. Hvis du får
"Fant ikke tittel" på en slik URL, har den sannsynligvis blitt migrert til
NVA — sjekk om hdl-lenken redirecter til `nva.sikt.no/registration/...`,
og bruk i så fall NVA-URL-en i stedet.

Hvis et felt mangler eller virker feil, åpne `.md`-fila og rett opp
manuelt — det er bare YAML.

Veiledede oppgaver vises i listen på `/undervisning`, men har **ingen
egen side på siden**: tittelen lenker direkte til kildelenken. De havner
også i RSS-feeden `/rss-undervisning.xml` med ekstern lenke.

### Bulk-import: alle dine veiledede oppgaver fra NVA

I stedet for å kjøre `nytt-oppgave` én og én, hent alle på én gang:

```bash
npm run hent-oppgaver
# eller med annet navn:
npm run hent-oppgaver -- "Annet Navn"
```

Scriptet kaller NVA-søke-API-et med `contributor_name=<navn>` og filtrerer
på `DegreeMaster`, `DegreeMasterTwoYear` og `DegreeBachelor`. For hvert
treff skrives én Markdown-fil til `src/content/undervisning/`. Eksisterende
filer **overskrives ikke** — kjør så ofte du vil, det blir bare hentet
nye poster siden sist.

Standardnavnet er `"Adam Leon Kleppe"` (hardkodet i `scripts/hent-oppgaver.mjs`).

## Designprinsipper

- Tekst-først, rask. Ingen blokkerende JS, ingen 3D, ingen tunge animasjoner.
- Mobil først — testes på iPhone-bredde.
- Tilgjengelig: semantisk HTML, alt-tekst, fungerer uten JS.
- Respekterer `prefers-reduced-motion` og `prefers-color-scheme`.
- Ingen kontaktskjema, ingen analytics, ingen sporing.

## Deploy

Designet for **Cloudflare Pages**. Standardoppsett:

- Build command: `npm run build`
- Output directory: `dist`
- Node-versjon: 20 eller nyere

Repoet inneholder ingen Cloudflare-spesifikk konfigurasjon — koble Pages til
GitHub-repoet manuelt, sett kommandoene over, og deploy. Auto-deploy ved
push til `main`.

## Hva som ikke er bygd i v1

Se [TODO.md](./TODO.md) for hva som mangler å fylles inn (placeholder-tekst),
og planlagte v2-features.
