import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const innlegg = (
    await getCollection("skriv", ({ data }) => !data.draft)
  ).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: "Adam Leon Kleppe — Skriv",
    description:
      "Essays og notater om robotikk, sim-to-real, undervisning og fagspråk.",
    site: context.site ?? "https://adamkleppe.no",
    items: innlegg.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/skriv/${p.slug}/`,
      categories: p.data.tags,
    })),
    customData: "<language>nb-no</language>",
  });
}
