# TODO

Steder hvor v1-byggingen har lagt igjen placeholder-innhold som må erstattes,
og en plan for v2-features.

## Placeholder-felter som må fylles ut

Søk i koden etter `TODO:` eller `PLACEHOLDER` for å finne alt. Her er hovedlisten:

### Globalt

- [ ] E-postadresse i klartekst — to steder:
  - `src/components/SiteFooter.astro`
  - `src/pages/index.astro` (kontakt-seksjon)
  - `src/pages/om.astro` (kontakt-seksjon)
- [ ] Portrettbilde til forsiden — legg fil i `public/portrett.jpg` og bytt
  ut plassholderboksen i `src/pages/index.astro`.
- [ ] Ekte OpenGraph-bilde — `public/og-default.svg` er en autogenerert SVG.
  De fleste plattformer (LinkedIn, Twitter/X) foretrekker PNG/JPG 1200×630.
  Erstatt med `public/og-default.png` og oppdater referansen i
  `src/components/SeoMeta.astro`.

### `/om`

- [ ] Skriv 2–3 avsnitt biografi.
- [ ] Fullfør liste over roller og verv (styre, komiteer, redaktørverv).
- [ ] CV — last opp PDF til `public/cv.pdf` og lenk fra siden, eller skriv
  ut tekstversjon.
- [ ] Lenker til ORCID, Google Scholar, Cristin/NVA, LinkedIn.
- [ ] Kontornummer.

### `/forskning`

- [ ] `src/content/forskning/biomekatronikk.md` — utvid beskrivelsen, fyll
  ut pågående prosjekter, samarbeidspartnere, og hvordan studenter kan
  bli med.
- [ ] `src/content/forskning/fagtermgruppen-robotikk.md` — fyll ut bakgrunn,
  konkret arbeid, ressurser.
- [ ] Legg til flere prosjektsider etter behov.

### `/publikasjoner`

- [ ] Fjern `src/content/publikasjoner/placeholder.md`.
- [ ] Legg inn alle reelle publikasjoner manuelt. (Se v2-plan under for
  NVA-API-integrasjon.)

### `/boka`

- [ ] Fyll ut pitch (2–3 avsnitt).
- [ ] Argumenter for norsk fagspråk.
- [ ] Innholdsplan / kapittel-liste.
- [ ] Statusbeskrivelse.

### `/undervisning`

- [ ] Erstatt eksempeloppgaven `src/content/undervisning/master-sim-to-real.md`
  med ekte tekst, eller fjern den.
- [ ] Legg til emner du underviser i (`kind: emne`).
- [ ] Legg til pedagogiske ressurser (`kind: ressurs`).

### `/formidling`

- [ ] Fjern `src/content/formidling/placeholder.md`.
- [ ] Legg inn NRK Pønsj, Historier som endret verden, SNL-arbeid, og andre
  oppslag.

### `/skriv`

- [ ] Erstatt `src/content/skriv/velkommen.md` med et ekte førsteinnlegg.

## v2-features — planlagt

### NVA-API-integrasjon for publikasjoner

NVA (Nasjonalt vitenarkiv) har et offentlig API. Plan:

1. Bygg en `src/lib/nva.ts` som henter publikasjonene mine fra NVA ved
   build-time (Astro kan kjøre `fetch` i frontmatter / loaders).
2. Cache responsen til `src/data/nva-cache.json` slik at builds er
   reproduserbare uten nettverk.
3. La `/publikasjoner` lese fra NVA-cache + manuelle Markdown-filer (manuelle
   vinner ved konflikt).
4. Vurder å eksportere til `src/data/publications.bib` automatisk.

Schemaet i `src/content/config.ts` for `publikasjoner` er allerede laget
slik at NVA-feltene mapper rett over.

### BibTeX-rendering

`src/data/publications.bib` er klar. Hvis vi vil rendre BibTeX direkte:

- Bruk f.eks. `bibtex-parse-js` eller `@retorquere/bibtex-parser` ved
  build-time.
- Lag en komponent `BibTexList.astro` som tar inn en parset liste og
  rendrer som `PublicationItem`.

### 3D-demo på `/boka`

Eksperiment med en *lett* WebGL-demo som visualiserer en robotarm. Krav:

- Lazy-load, ikke blokker LCP.
- Respekter `prefers-reduced-motion` — vis statisk fallback.
- Total JS-payload under 100 KB gzip.
- `<canvas>` med `tabindex` og alt-tekst.

### Engelsk versjon

Bruk Astro i18n-routing. Sannsynligvis bare `/om` og `/forskning` trenger
engelsk versjon, ikke hele siden. Filnavn-konvensjon: `om.en.md` eller egne
content collections.

### Plausible/analytics

Hvis det blir aktuelt: Plausible (cookieless, GDPR-vennlig). Script
i `BaseLayout.astro` med `data-domain="adamkleppe.no"`.

### Søk

Pagefind for offline statisk søk — fungerer godt med Astro-content
collections.

### Lighthouse-budsjett

Mål: 95+ på alle fire akser. Sett opp `@lhci/cli` i en GitHub Action og
fail bygget hvis det faller under terskel.
