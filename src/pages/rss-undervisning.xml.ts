import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const oppslag = (await getCollection("undervisning")).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: "Adam Leon Kleppe — Undervisning",
    description:
      "Emner, ressurser og åpne studentoppgaver i biomekatronisk gruppe ved NTNU Ålesund.",
    site: context.site ?? "https://adamkleppe.no",
    items: oppslag.map((e) => {
      const isStudentoppgave = e.data.kind === "studentoppgave";
      const link = isStudentoppgave && e.data.url
        ? e.data.url
        : `/undervisning/${e.slug}/`;
      const description = e.data.description
        ?? (e.data.student?.length
          ? `${e.data.student.join(", ")}${e.data.år ? ` (${e.data.år})` : ""}`
          : e.data.title);
      return {
        title: e.data.title,
        description,
        pubDate: e.data.pubDate,
        link,
        categories: [e.data.kind, ...(e.data.nivå ? [e.data.nivå] : []), ...e.data.tags],
      };
    }),
    customData: "<language>nb-no</language>",
  });
}
