import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { QUESTION_PROMPTS } from "./ingest/types";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const DISCIPLINES = [
  "História",
  "Biologia",
  "Português (Produção e Interpretação de Texto)",
  "Matemática",
  "Geografia",
  "Química",
  "Filosofia / Sociologia",
  "Física",
  "Português (Literatura)",
  "Polivalente (Anos Iniciais)",
  "Polivalente (Educação Infantil)",
  "Educação Física",
  "Inglês",
  "Arte",
  "Espanhol",
];

const LESSON_CRITERIA = [
  "Empatia",
  "Presença",
  "Linguagem",
  "Preparação",
  "Material",
  "Aferição",
  "Clareza",
  "Paciência",
  "Responsabilidade",
  "Energia",
  "Lousa",
  "Resolução Exercício",
  "Voz",
  "Confiança",
];

const DIMENSIONS: {
  code: (typeof schema.dimensionCodeEnum.enumValues)[number];
  name: string;
  sort: number;
}[] = [
  { code: "prova_conteudo", name: "Prova de conteúdo", sort: 1 },
  { code: "didatica_objetiva", name: "Didática objetiva", sort: 2 },
  { code: "didatica_humana", name: "Didática humana", sort: 3 },
  { code: "curriculo", name: "Currículo", sort: 4 },
  { code: "video", name: "Vídeo", sort: 5 },
  { code: "entrevista", name: "Entrevista", sort: 6 },
  { code: "aula_teste", name: "Aula-teste", sort: 7 },
  { code: "socioemocional", name: "Socioemocional", sort: 8 },
];

const CAMPAIGNS = [
  {
    name: "2025 — EFAF-EM",
    slug: "2025-efaf-em",
    description: "Processo seletivo docente EFAF-EM 2025",
  },
  {
    name: "2026 — SCS",
    slug: "2026-scs",
    description: "Processo seletivo docente SCS 2026-08",
  },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureInstruments(campaignId: string) {
  for (const [code, promptText] of Object.entries(QUESTION_PROMPTS)) {
    const rows = await db
      .select()
      .from(schema.instruments)
      .where(eq(schema.instruments.campaignId, campaignId));
    const found = rows.find((r) => r.code === code);
    if (found) {
      await db
        .update(schema.instruments)
        .set({
          promptText,
          needsSourceText: false,
        })
        .where(eq(schema.instruments.id, found.id));
    } else {
      await db.insert(schema.instruments).values({
        campaignId,
        code,
        type: "subjective_question",
        promptText,
        scaleMax: "30",
        needsSourceText: false,
      });
    }
  }
}

async function main() {
  console.log("Seeding catalog...");

  await db
    .insert(schema.staffUsers)
    .values({
      email: "luis.ribeiro@liceujardim.pro.br",
      name: "Luis Eduardo Eugênio Ribeiro",
      role: "admin",
      active: true,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.staffUsers)
    .values({
      email: "renato.amigo@liceujardim.com.br",
      name: "Renato Amigo",
      role: "avaliador",
      active: true,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.staffUsers)
    .values({
      email: "rebeca.fazzani@liceujardim.com.br",
      name: "Rebeca Fazzani",
      role: "admin",
      active: true,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.staffUsers)
    .values({
      email: "ingest@internal",
      name: "Importação",
      role: "consulta",
      active: true,
    })
    .onConflictDoNothing();

  for (const name of DISCIPLINES) {
    await db
      .insert(schema.disciplines)
      .values({ name, slug: slugify(name) })
      .onConflictDoNothing();
  }

  await db
    .insert(schema.units)
    .values({ name: "Liceu Jardim", slug: "liceu-jardim" })
    .onConflictDoNothing();

  await db
    .insert(schema.segments)
    .values({ name: "EMEFAF", slug: "emefaf" })
    .onConflictDoNothing();

  const campaignIds: Record<string, string> = {};
  for (const c of CAMPAIGNS) {
    const [inserted] = await db
      .insert(schema.campaigns)
      .values({ ...c, status: "ativa" })
      .onConflictDoNothing()
      .returning({ id: schema.campaigns.id });

    if (inserted) {
      campaignIds[c.slug] = inserted.id;
    } else {
      const [existing] = await db
        .select({ id: schema.campaigns.id })
        .from(schema.campaigns)
        .where(eq(schema.campaigns.slug, c.slug))
        .limit(1);
      if (existing) campaignIds[c.slug] = existing.id;
    }
  }

  for (const dim of DIMENSIONS) {
    await db
      .insert(schema.dimensions)
      .values({
        code: dim.code,
        name: dim.name,
        sortOrder: dim.sort,
      })
      .onConflictDoUpdate({
        target: schema.dimensions.code,
        set: { name: dim.name, sortOrder: dim.sort },
      });
  }

  const dims = await db.select().from(schema.dimensions);
  const dimByCode = Object.fromEntries(dims.map((d) => [d.code, d]));

  const existingWeights = await db.select().from(schema.weightConfigs).limit(1);
  if (existingWeights.length === 0) {
    const [weightConfig] = await db
      .insert(schema.weightConfigs)
      .values({ label: "Pesos iniciais v1 (igualitários)" })
      .returning();

    const equalWeight = (1 / 7).toFixed(4);
    for (const code of [
      "prova_conteudo",
      "didatica_objetiva",
      "didatica_humana",
      "curriculo",
      "video",
      "entrevista",
      "aula_teste",
    ] as const) {
      const dim = dimByCode[code];
      if (dim && weightConfig) {
        await db.insert(schema.weightConfigItems).values({
          weightConfigId: weightConfig.id,
          dimensionId: dim.id,
          weight: equalWeight,
        });
      }
    }
  }

  for (let i = 0; i < LESSON_CRITERIA.length; i++) {
    const name = LESSON_CRITERIA[i];
    await db
      .insert(schema.lessonTestCriteria)
      .values({
        code: slugify(name),
        name,
        sortOrder: i + 1,
      })
      .onConflictDoNothing();
  }

  for (const slug of Object.keys(campaignIds)) {
    await ensureInstruments(campaignIds[slug]);
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
