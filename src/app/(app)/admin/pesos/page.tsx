import { PageHeader } from "@/components/layout/page-header";
import {
  WeightsForm,
  type WeightGroup,
  type WeightRow,
} from "@/components/admin/weights-form";
import { requireStaff } from "@/lib/auth/staff";
import { dimensionLabels, labelFor, scoringItemLabel } from "@/lib/labels";
import { getWeightConfigSummary } from "@/lib/actions/weights";
import { getScoringCatalog } from "@/lib/queries/scoring-data";

/**
 * O 1/2 de conteúdo não é um número arbitrário: é a fórmula
 * `FINAL CONT = (OBJ + 2*DISC)/3` da planilha de 2025, que decidiu a nota de 68
 * candidaturas. Quem for mexer nele precisa saber disso na hora de mexer.
 */
const HINTS: Record<string, string> = {
  conteudo_dissertativa:
    "A planilha de 2025 usava (objetiva + 2 × dissertativa) / 3 — este 2 é aquele peso.",
  conteudo_objetiva: "Contrapeso do 2 da dissertativa.",
};

export default async function PesosPage() {
  await requireStaff(["admin"]);

  const [catalog, summary] = await Promise.all([
    getScoringCatalog(),
    getWeightConfigSummary(),
  ]);

  const grouped = new Set(catalog.groups.flatMap((g) => g.members));

  // Os itens do Resultado, na ordem de leitura: os grupos e o que não tem grupo.
  const items: WeightRow[] = [
    ...catalog.groups.map((group) => ({
      code: group.code,
      label: scoringItemLabel(group.code),
      weight: catalog.weights[group.code] ?? 0,
    })),
    ...catalog.dimensions
      .filter((dim) => !grouped.has(dim.code))
      .map((dim) => ({
        code: dim.code,
        label: labelFor(dimensionLabels, dim.code),
        weight: catalog.weights[dim.code] ?? 0,
      })),
  ];

  const groups: WeightGroup[] = catalog.groups.map((group) => ({
    code: group.code,
    label: scoringItemLabel(group.code),
    members: group.members.map((code) => ({
      code,
      label: labelFor(dimensionLabels, code),
      weight: catalog.memberWeights[code] ?? 1,
      hint: HINTS[code],
    })),
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumb={[{ label: "Admin" }, { label: "Pesos" }]}
        title="Pesos do Resultado"
        sub={
          summary
            ? `${summary.label} — em vigor desde ${new Date(
                summary.validFrom,
              ).toLocaleDateString("pt-BR")}`
            : "Nenhuma configuração salva. O Resultado está usando pesos iguais."
        }
      />
      <WeightsForm items={items} groups={groups} />
    </div>
  );
}
