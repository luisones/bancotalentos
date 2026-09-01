import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

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
  { code: "prova_conteudo", name: "Prova objetiva", sort: 1 },
  { code: "didatica_objetiva", name: "Didática objetiva", sort: 2 },
  { code: "didatica_humana", name: "Didática humana", sort: 3 },
  { code: "curriculo", name: "Currículo", sort: 4 },
  { code: "video", name: "Vídeo", sort: 5 },
  { code: "entrevista", name: "Entrevista", sort: 6 },
  { code: "aula_teste", name: "Aula-teste", sort: 7 },
  { code: "socioemocional", name: "Socioemocional", sort: 8 },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

  const [campaign] = await db
    .insert(schema.campaigns)
    .values({
      name: "2025 — EFAF-EM",
      slug: "2025-efaf-em",
      description: "Processo seletivo docente EFAF-EM 2025",
      status: "ativa",
    })
    .onConflictDoNothing()
    .returning();

  let campaignId = campaign?.id;
  if (!campaignId) {
    const existing = await db
      .select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.slug, "2025-efaf-em"))
      .limit(1);
    campaignId = existing[0]?.id;
  }

  for (const dim of DIMENSIONS) {
    await db
      .insert(schema.dimensions)
      .values({
        code: dim.code,
        name: dim.name,
        sortOrder: dim.sort,
      })
      .onConflictDoNothing();
  }

  const dims = await db.select().from(schema.dimensions);
  const dimByCode = Object.fromEntries(dims.map((d) => [d.code, d]));

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

  if (campaignId) {
    for (const q of ["Q1", "Q2", "Q3", "Q4"]) {
      await db.insert(schema.instruments).values({
        campaignId,
        code: q,
        type: "subjective_question",
        promptText: `[Texto original da pergunta ${q} pendente de fonte]`,
        scaleMax: "30",
        needsSourceText: true,
      });
    }
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
