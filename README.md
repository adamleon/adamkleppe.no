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

### Ny studentoppgave eller emne

`src/content/undervisning/<slug>.md` med `kind: emne | studentoppgave | ressurs`.
Studentoppgaver havner i RSS-feeden `/rss-undervisning.xml` slik at studenter
kan abonnere.

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
