"use server";

import { desc, eq } from "drizzle-orm";
import { isAdmin, requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import {
  auditEvents,
  dimensions,
  weightConfigItems,
  weightConfigs,
} from "@/lib/db/schema";
import { getScoringCatalog } from "@/lib/queries/scoring-data";
import { err, ok, type ActionResult } from "./result";
import { revalidateCandidateViews } from "./revalidate";

export type WeightInput = {
  /** Peso de cada item do Resultado: os grupos e as dimensões sem grupo. */
  items: Record<string, number>;
  /** Peso de cada parte DENTRO de um grupo, por código de dimensão. */
  members: Record<string, number>;
};

function invalid(values: Record<string, number>): boolean {
  return Object.values(values).some(
    (v) => !Number.isFinite(v) || v < 0 || v > 999,
  );
}

/**
 * Salva os pesos criando uma configuração NOVA, nunca editando a vigente.
 *
 * O consolidado é sempre calculado com a `weight_configs` de `valid_from` mais
 * recente. Sobrescrever a atual apagaria a única evidência de com que pesos uma
 * decisão passada foi tomada — e decisões passadas continuam registradas em
 * `audit_events` apontando para notas que teriam mudado de significado.
 */
export async function saveWeightConfig(
  input: WeightInput,
): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!isAdmin(staff)) return err("sem_permissao");

  if (invalid(input.items) || invalid(input.members)) {
    return err("nota_invalida");
  }
  // Um Resultado com todos os pesos zerados não é um Resultado.
  if (Object.values(input.items).every((v) => v <= 0)) {
    return err("nota_fora_da_faixa", "items");
  }
  // O mesmo vale dentro de cada grupo, senão o grupo inteiro some do cálculo.
  const catalog = await getScoringCatalog();
  for (const group of catalog.groups) {
    const partes = group.members.map((code) => input.members[code] ?? 0);
    if (partes.length > 0 && partes.every((v) => v <= 0)) {
      return err("nota_fora_da_faixa", group.code);
    }
  }

  const [previous] = await db
    .select({ id: weightConfigs.id, label: weightConfigs.label })
    .from(weightConfigs)
    .orderBy(desc(weightConfigs.validFrom))
    .limit(1);

  const [config] = await db
    .insert(weightConfigs)
    .values({
      label: `Pesos de ${new Date().toLocaleDateString("pt-BR")}`,
      createdByStaffId: staff.id,
    })
    .returning();

  if (!config) return err("erro_inesperado");

  const dimensionRows = await db
    .select({ id: dimensions.id, code: dimensions.code })
    .from(dimensions);
  const idByCode = new Map(dimensionRows.map((d) => [d.code as string, d.id]));

  const rows: Array<typeof weightConfigItems.$inferInsert> = [];
  for (const [code, weight] of Object.entries(input.items)) {
    rows.push({
      weightConfigId: config.id,
      groupCode: code,
      weight: weight.toFixed(4),
    });
  }
  for (const [code, weight] of Object.entries(input.members)) {
    const dimensionId = idByCode.get(code);
    if (!dimensionId) return err("dimensao_invalida", code);
    rows.push({
      weightConfigId: config.id,
      dimensionId,
      weight: weight.toFixed(4),
    });
  }
  if (rows.length > 0) await db.insert(weightConfigItems).values(rows);

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "weights_updated",
    entityType: "weight_config",
    entityId: config.id,
    metadata: {
      de: previous?.label ?? null,
      para: { itens: input.items, partes: input.members },
    },
  });

  revalidateCandidateViews();
  return ok();
}

/** Configuração vigente, para a tela de edição partir do que está valendo. */
export async function getWeightConfigSummary() {
  const [config] = await db
    .select({
      id: weightConfigs.id,
      label: weightConfigs.label,
      validFrom: weightConfigs.validFrom,
    })
    .from(weightConfigs)
    .orderBy(desc(weightConfigs.validFrom))
    .limit(1);

  if (!config) return null;

  const count = await db
    .select({ id: weightConfigItems.id })
    .from(weightConfigItems)
    .where(eq(weightConfigItems.weightConfigId, config.id));

  return { ...config, itemCount: count.length };
}
