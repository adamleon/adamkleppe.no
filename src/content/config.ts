import { defineCollection, z } from "astro:content";

const skriv = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

const undervisning = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    kind: z.enum(["emne", "studentoppgave", "ressurs"]),
    nivå: z.enum(["bachelor", "master", "phd", "annet"]).optional(),
    pubDate: z.coerce.date(),
    status: z.enum(["åpen", "tatt", "fullført"]).optional(),
    student: z.array(z.string()).optional(),
    år: z.number().optional(),
    url: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const forskning = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(["pågående", "planlagt", "avsluttet"]),
    pubDate: z.coerce.date(),
    medvirkende: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

const publikasjoner = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    forfattere: z.array(z.string()),
    år: z.number(),
    type: z.enum(["artikkel", "konferanse", "bok", "bokkapittel", "annet"]),
    publisert_i: z.string().optional(),
    doi: z.string().optional(),
    url: z.string().url().optional(),
    sammendrag: z.string().optional(),
  }),
});

const formidling = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    dato: z.coerce.date(),
    kanal: z.string(),
    type: z.enum(["medieoppslag", "foredrag", "podcast", "kronikk", "annet"]),
    url: z.string().url().optional(),
  }),
});

export const collections = {
  skriv,
  undervisning,
  forskning,
  publikasjoner,
  formidling,
};
