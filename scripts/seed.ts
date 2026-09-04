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

/**
 * Ordem de leitura da página do professor: AT · DO · DD · CD · CO · VD.
 *
 * `prova_conteudo` e `didatica_humana` não estão aqui: a primeira virou duas
 * dimensões (a prova objetiva e a dissertativa, que a planilha de 2025
 * misturava) e a segunda era o nome errado de `didatica_dissertativa`.
 * `curriculo`, `entrevista` e `socioemocional` nunca tiveram nota em campanha
 * nenhuma e ficam inativas em vez de diluir o Resultado.
 */
const DIMENSIONS: {
  code: (typeof schema.dimensionCodeEnum.enumValues)[number];
  name: string;
  sort: number;
  group: string | null;
  short: string | null;
  active: boolean;
}[] = [
  { code: "aula_teste",            name: "Aula-teste",             sort: 1,  group: null,        short: "AT", active: true },
  { code: "didatica_objetiva",     name: "Didática objetiva",      sort: 2,  group: "didatica",  short: "DO", active: true },
  { code: "didatica_dissertativa", name: "Didática dissertativa",  sort: 3,  group: "didatica",  short: "DD", active: true },
  { code: "conteudo_dissertativa", name: "Conteúdo dissertativa",  sort: 4,  group: "conteudo",  short: "CD", active: true },
  { code: "conteudo_objetiva",     name: "Conteúdo objetiva",      sort: 5,  group: "conteudo",  short: "CO", active: true },
  { code: "video",                 name: "Vídeo",                  sort: 6,  group: null,        short: "VD", active: true },
  { code: "curriculo",             name: "Currículo",              sort: 90, group: null,        short: null, active: false },
  { code: "entrevista",            name: "Entrevista",             sort: 90, group: null,        short: null, active: false },
  { code: "socioemocional",        name: "Socioemocional",         sort: 90, group: null,        short: null, active: false },
  { code: "prova_conteudo",        name: "Prova de conteúdo",      sort: 90, group: null,        short: null, active: false },
  { code: "didatica_humana",       name: "Didática humana",        sort: 90, group: null,        short: null, active: false },
];

/** Peso de cada GRUPO no Resultado. Editável em /admin/pesos. */
const GROUP_WEIGHTS: Record<string, string> = {
  didatica: "0.3000",
  conteudo: "0.3000",
  aula_teste: "0.3000",
  video: "0.1000",
};

/**
 * Peso de cada PARTE dentro do grupo.
 *
 * O 1/2 de conteúdo é herdado da planilha de 2025 — `FINAL CONT = (OBJ + 2*DISC)/3`
 * — e é o que faz a nota histórica de 68 candidaturas continuar significando a
 * mesma coisa. O 1/1 de didática é o padrão neutro: a planilha misturava as
 * duas por outra via (`(12*AprDisF + 17*AprObj)/29`) que o sistema
 * deliberadamente não importa.
 */
const MEMBER_WEIGHTS: Record<string, string> = {
  didatica_objetiva: "1.0000",
  didatica_dissertativa: "1.0000",
  conteudo_objetiva: "1.0000",
  conteudo_dissertativa: "2.0000",
};

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
        groupCode: dim.group,
        shortCode: dim.short,
        active: dim.active,
      })
      .onConflictDoUpdate({
        target: schema.dimensions.code,
        set: {
          name: dim.name,
          sortOrder: dim.sort,
          groupCode: dim.group,
          shortCode: dim.short,
          active: dim.active,
        },
      });
  }

  const dims = await db.select().from(schema.dimensions);
  const dimByCode = Object.fromEntries(dims.map((d) => [d.code, d]));

  // A configuração vigente é a de `valid_from` mais recente; nunca editamos uma
  // existente, porque o histórico de pesos é o que torna uma nota antiga
  // auditável. Aqui só criamos a v2 se ela ainda não existir.
  const V2_LABEL = "Pesos v2 (grupos)";
  const [existingV2] = await db
    .select({ id: schema.weightConfigs.id })
    .from(schema.weightConfigs)
    .where(eq(schema.weightConfigs.label, V2_LABEL))
    .limit(1);

  if (!existingV2) {
    const [weightConfig] = await db
      .insert(schema.weightConfigs)
      .values({ label: V2_LABEL })
      .returning();

    if (weightConfig) {
      for (const [groupCode, weight] of Object.entries(GROUP_WEIGHTS)) {
        await db.insert(schema.weightConfigItems).values({
          weightConfigId: weightConfig.id,
          groupCode,
          weight,
        });
      }
      for (const [code, weight] of Object.entries(MEMBER_WEIGHTS)) {
        const dim = dimByCode[code];
        if (!dim) continue;
        await db.insert(schema.weightConfigItems).values({
          weightConfigId: weightConfig.id,
          dimensionId: dim.id,
          weight,
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
