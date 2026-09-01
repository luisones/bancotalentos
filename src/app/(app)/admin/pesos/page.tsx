import { requireStaff } from "@/lib/auth/staff";
import { dimensionLabels, labelFor } from "@/lib/labels";
import { getActiveWeights } from "@/lib/queries/scoring-data";
import { db } from "@/lib/db";
import { dimensions, weightConfigItems, weightConfigs } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export default async function PesosPage() {
  await requireStaff(["admin"]);

  const [latestConfig] = await db
    .select()
    .from(weightConfigs)
    .orderBy(desc(weightConfigs.validFrom))
    .limit(1);

  const allDimensions = await db
    .select()
    .from(dimensions)
    .orderBy(dimensions.sortOrder);

  const activeWeights = await getActiveWeights();

  const items = latestConfig
    ? await db
        .select({
          dimensionName: dimensions.name,
          dimensionCode: dimensions.code,
          weight: weightConfigItems.weight,
        })
        .from(weightConfigItems)
        .innerJoin(dimensions, eq(dimensions.id, weightConfigItems.dimensionId))
        .where(eq(weightConfigItems.weightConfigId, latestConfig.id))
    : [];

  const totalWeight = items.reduce((sum, i) => sum + Number(i.weight), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--liceu-navy)]">
          Configuração de pesos
        </h1>
        <p className="text-sm text-muted-foreground">
          Pesos das dimensões para cálculo da nota consolidada
        </p>
      </div>

      {latestConfig ? (
        <div className="liceu-card p-4">
          <p className="text-sm text-muted-foreground">
            Configuração ativa: <strong>{latestConfig.label}</strong> — válida
            desde{" "}
            {new Date(latestConfig.validFrom).toLocaleDateString("pt-BR")}
          </p>
        </div>
      ) : (
        <div className="liceu-card p-4 text-sm text-muted-foreground">
          Nenhuma configuração de pesos cadastrada. Usando pesos iguais por
          dimensão.
        </div>
      )}

      <div className="liceu-card overflow-hidden">
        <table className="liceu-table w-full">
          <thead>
            <tr>
              <th>Dimensão</th>
              <th className="text-right">Peso</th>
              <th className="text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {allDimensions.map((dim) => {
              const item = items.find((i) => i.dimensionCode === dim.code);
              const weight = item
                ? Number(item.weight)
                : activeWeights[dim.code] ?? 0;
              const pct =
                totalWeight > 0
                  ? ((weight / totalWeight) * 100).toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })
                  : "—";
              return (
                <tr key={dim.id}>
                  <td>{labelFor(dimensionLabels, dim.code)}</td>
                  <td className="text-right tabular-nums">
                    {weight.toLocaleString("pt-BR", {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td className="text-right tabular-nums">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
