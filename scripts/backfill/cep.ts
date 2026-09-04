#!/usr/bin/env tsx
/**
 * Preenche `candidates.postal_code`.
 *
 * O CEP sempre existiu nos workbooks de origem — o ingest o descartava. Duas
 * fontes, nesta ordem de precedência:
 *
 *   1. workbooks IDENTIFICADOS (`CANDIDATOS.cep`): 264/264 em 2025 e 405/428
 *      em 2026. Casam por `pessoa_id` -> `candidates.external_ref`.
 *   2. `tmp/originais/2025/CEPS-2025.csv`, as 646 respostas cruas do formulário
 *      de 2025. Confere com o workbook de 2025 em 264 de 264 (nenhuma
 *      divergência) e alcança 4 pessoas de 2026 que também se inscreveram em
 *      2025. Casa por e-mail e, quando o e-mail tem erro de digitação — e tem,
 *      `@gmail.coml` está lá —, por nome normalizado.
 *
 * Quem não bater em nenhuma das duas fica com `postal_code` nulo. Não há
 * fallback para cidade: um centroide de município não é o endereço de ninguém,
 * e o resto do sistema já sabe lidar com dado ausente sem transformá-lo em zero.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, isNull } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";
import { candidates } from "../../src/lib/db/schema";
import { cellText, readSheet } from "../ingest/read-workbook";

const WORKBOOKS = [
  "tmp/2025-EFAF-EM_IDENTIFICADO.xlsx",
  "tmp/2026-SCS_IDENTIFICADO.xlsx",
];
const CSV_2025 = "tmp/originais/2025/CEPS-2025.csv";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

/**
 * 8 dígitos, sem hífen. O formulário do Google gravava número, então CEP
 * iniciado em zero chega truncado: `4296000` é `04296000`. Qualquer coisa que
 * não feche 8 dígitos é descartada em vez de completada por chute.
 */
export function normalizeCep(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0 || digits.length > 8) return null;
  return digits.padStart(8, "0");
}

/** Minúsculas, sem acento, só letras e espaço. */
function normalizeName(raw: string | null): string {
  if (!raw) return "";
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(raw: string | null): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Parser mínimo de CSV com aspas — o arquivo tem vírgulas dentro de campos. */
function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...body] = rows;
  return body
    .filter((r) => r.some((c) => c.trim().length > 0))
    .map((r) =>
      Object.fromEntries(headers.map((h, i) => [h.trim(), (r[i] ?? "").trim()])),
    );
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Fonte 1: workbooks, por pessoa_id.
  const cepByExternalRef = new Map<string, string>();
  for (const file of WORKBOOKS) {
    for (const row of readSheet(file, "CANDIDATOS")) {
      const pessoaId = cellText(row, "pessoa_id");
      const cep = normalizeCep(cellText(row, "cep"));
      if (pessoaId && cep) cepByExternalRef.set(pessoaId, cep);
    }
  }
  console.log(`Workbooks: ${cepByExternalRef.size} CEPs.`);

  // Fonte 2: CSV do formulário de 2025, por e-mail e por nome.
  const cepByEmail = new Map<string, string>();
  const cepByName = new Map<string, string>();
  for (const row of parseCsv(readFileSync(CSV_2025, "utf-8"))) {
    const cep = normalizeCep(row["CEP de sua Residência"] ?? null);
    if (!cep) continue;
    const email = normalizeEmail(row["Endereço de e-mail"] ?? null);
    const name = normalizeName(row["Nome"] ?? null);
    if (email && !cepByEmail.has(email)) cepByEmail.set(email, cep);
    if (name && !cepByName.has(name)) cepByName.set(name, cep);
  }
  console.log(
    `CSV 2025: ${cepByEmail.size} por e-mail, ${cepByName.size} por nome.`,
  );

  const rows = await db
    .select({
      id: candidates.id,
      externalRef: candidates.externalRef,
      email: candidates.email,
      fullName: candidates.fullName,
    })
    .from(candidates)
    .where(isNull(candidates.postalCode));

  console.log(`Banco: ${rows.length} candidatos sem CEP.`);

  const updates: Array<{ id: string; cep: string; source: string }> = [];
  const counts = { workbook: 0, csv_email: 0, csv_nome: 0, nenhum: 0 };

  for (const row of rows) {
    const fromWorkbook = row.externalRef
      ? cepByExternalRef.get(row.externalRef)
      : undefined;
    if (fromWorkbook) {
      updates.push({ id: row.id, cep: fromWorkbook, source: "workbook" });
      counts.workbook += 1;
      continue;
    }

    const fromEmail = cepByEmail.get(normalizeEmail(row.email));
    if (fromEmail) {
      updates.push({ id: row.id, cep: fromEmail, source: "csv_2025" });
      counts.csv_email += 1;
      continue;
    }

    const fromName = cepByName.get(normalizeName(row.fullName));
    if (fromName) {
      updates.push({ id: row.id, cep: fromName, source: "csv_2025" });
      counts.csv_nome += 1;
      continue;
    }

    counts.nenhum += 1;
  }

  console.log(
    `workbook ${counts.workbook} · csv por e-mail ${counts.csv_email} · ` +
      `csv por nome ${counts.csv_nome} · sem CEP ${counts.nenhum}`,
  );

  if (dryRun) {
    console.log("--dry-run: nada gravado.");
    return;
  }

  for (const u of updates) {
    await db
      .update(candidates)
      .set({ postalCode: u.cep, postalCodeSource: u.source })
      .where(eq(candidates.id, u.id));
  }
  console.log(`Gravados ${updates.length} CEPs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
