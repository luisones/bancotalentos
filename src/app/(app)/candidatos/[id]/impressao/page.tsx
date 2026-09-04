import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintPicker } from "@/components/candidate/print-picker";
import { DefinitionList } from "@/components/liceu/field-block";
import { MicroHeader } from "@/components/liceu/surface";
import { requireStaff } from "@/lib/auth/staff";
import { buildProfileViewModel } from "@/lib/candidate/view-model";
import { PRINT_SECTIONS, type PrintSectionId } from "@/lib/candidate/print";
import { getCandidateDetail } from "@/lib/queries/candidate-detail";
import {
  getDisciplinePositions,
  getScoredApplications,
} from "@/lib/queries/scored-applications";
import { formatDate } from "@/lib/format";

export default async function ImpressaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaff();
  const { id } = await params;
  const query = await searchParams;

  const detail = await getCandidateDetail(id, staff.id);
  if (!detail) notFound();

  const focusedId =
    (typeof query.candidatura === "string" ? query.candidatura : undefined) ??
    detail.defaultApplicationId ??
    detail.applications[0]?.id;

  const [{ byApplicationId }, positions] = await Promise.all([
    getScoredApplications(staff.id),
    focusedId
      ? getDisciplinePositions(focusedId, staff.id)
      : Promise.resolve({ campaign: null, bank: null }),
  ]);

  const vm = buildProfileViewModel({
    detail,
    scored: focusedId ? byApplicationId.get(focusedId) : undefined,
    positions,
    staff,
    focusedApplicationId: focusedId,
  });

  const raw = typeof query.secoes === "string" ? query.secoes : null;
  const selected = new Set<PrintSectionId>(
    raw
      ? (raw
          .split(",")
          .filter((s) =>
            PRINT_SECTIONS.some((p) => p.id === s),
          ) as PrintSectionId[])
      : PRINT_SECTIONS.filter((p) => p.defaultOn).map((p) => p.id),
  );
  const assinaturas = query.assinaturas === "1";

  return (
    <div className="pb-16">
      <PrintPicker
        candidateId={id}
        selected={[...selected]}
        assinaturas={assinaturas}
        backHref={`/candidatos/${id}`}
      />

      <article className="mx-auto mt-6 max-w-[820px] bg-card px-10 py-10 print:mt-0 print:max-w-none print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-navy pb-3.5">
          <span className="font-heading text-title font-bold text-navy">
            Liceu Jardim
          </span>
          <div className="text-meta text-right leading-relaxed text-ink-3">
            <p className="font-semibold text-navy">Banco de Talentos Docentes</p>
            <p>Documento interno de acompanhamento de processo seletivo</p>
            <p>
              Emitido em {formatDate(new Date())} por {staff.name}
            </p>
          </div>
        </header>

        <div className="my-6 text-center">
          <h1 className="font-heading text-title font-bold uppercase tracking-[0.06em] text-navy">
            Relatório individual do candidato
          </h1>
          <p className="text-tag mt-1.5 uppercase tracking-badge text-label">
            {vm.identity.name}
            {vm.focused ? ` · ${vm.focused.label}` : ""}
          </p>
        </div>

        {vm.identity.quickNote && (
          <p className="text-cell mb-5 border-l-[3px] border-l-gold-text bg-gold-bg px-3 py-2">
            {vm.identity.quickNote}
          </p>
        )}

        <section className="mb-6">
          <MicroHeader>Identificação</MicroHeader>
          <DefinitionList
            labelWidth={140}
            rows={[
              { label: "Nome", value: vm.identity.name },
              {
                label: "Disciplina",
                value: vm.identity.disciplineName ?? "—",
              },
              { label: "E-mail", value: vm.identity.email ?? "—" },
              { label: "Telefone", value: vm.identity.phone ?? "—" },
              {
                label: "Status",
                value: `${vm.identity.statusLabel}${vm.identity.starred ? " · destaque da equipe" : ""}`,
              },
              {
                label: "Posição na disciplina",
                value:
                  vm.identity.positions.length > 0
                    ? vm.identity.positions
                        .map((p) => `${p.label} ${p.scope}`)
                        .join(" · ")
                    : "sem posição — ainda não há Resultado",
              },
              { label: "Inglês", value: vm.identity.englishLevel ?? "—" },
              {
                label: "Distância até as unidades",
                value:
                  vm.identity.distances.santoAndre &&
                  vm.identity.distances.saoCaetano
                    ? `Santo André ${vm.identity.distances.santoAndre} · São Caetano ${vm.identity.distances.saoCaetano}`
                    : "sem CEP cadastrado",
              },
            ]}
          />
          {vm.identity.distances.note && (
            <p className="text-meta mt-1 text-ink-3">
              Distâncias: {vm.identity.distances.note}.
            </p>
          )}
        </section>

        {selected.has("notas") && (
          <section className="mb-6 break-inside-avoid">
            <MicroHeader>Notas e resultado</MicroHeader>
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th className="text-micro py-1.5 text-left uppercase tracking-micro text-label">
                    Item
                  </th>
                  <th className="text-micro py-1.5 text-left uppercase tracking-micro text-label">
                    Partes
                  </th>
                  <th className="text-micro py-1.5 text-right uppercase tracking-micro text-label">
                    Nota
                  </th>
                </tr>
              </thead>
              <tbody>
                {vm.scores.cards.map((card) => (
                  <tr key={card.code} className="border-b border-rule-weak">
                    <td className="text-cell py-1.5">{card.label}</td>
                    <td className="text-note py-1.5 text-ink-3">
                      {card.parts.length > 0
                        ? card.parts
                            .map(
                              (p) =>
                                `${p.label}: ${p.score === null ? "não aplicada" : p.display}`,
                            )
                            .join(" · ")
                        : card.score === null
                          ? "não aplicado"
                          : "—"}
                    </td>
                    <td className="text-cell py-1.5 text-right font-semibold tabular-nums">
                      {card.display}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-note mt-2 text-ink-3">
              Resultado consolidado{" "}
              <strong className="font-semibold">{vm.scores.display}</strong>{" "}
              sobre {vm.scores.coverage} de {vm.scores.totalDimensions} itens.
              Item ausente não conta como zero.
            </p>
          </section>
        )}

        {selected.has("materiais") && (
          <section className="mb-6 break-inside-avoid">
            <MicroHeader>Currículo e vídeo</MicroHeader>
            <DefinitionList
              labelWidth={140}
              rows={[
                {
                  label: "Currículo",
                  value: vm.materials.curriculoUrl ?? "não anexado",
                },
                {
                  label: "Vídeo",
                  value: vm.materials.videoUrl ?? "não anexado",
                },
              ]}
            />
          </section>
        )}

        {selected.has("respostas") && (
          <section className="mb-6">
            <MicroHeader>Respostas dissertativas</MicroHeader>
            {vm.scores.answers.length === 0 ? (
              <p className="text-note text-ink-3">Nenhuma resposta registrada.</p>
            ) : (
              vm.scores.answers.map((a) => (
                <div key={a.answerId} className="mb-3 break-inside-avoid">
                  <p className="text-cell font-semibold text-navy">
                    {a.order}. {a.prompt}
                    <span className="float-right tabular-nums">
                      {a.effectivePercent === null
                        ? "—"
                        : `${Math.round(a.effectivePercent)}%`}
                    </span>
                  </p>
                  <p className="text-note whitespace-pre-wrap leading-relaxed text-ink-2">
                    {a.text}
                  </p>
                </div>
              ))
            )}
          </section>
        )}

        {selected.has("praticas") && (
          <PrintList
            title="Práticas declaradas"
            rows={vm.scores.practices.map((p) => ({
              left: p.label,
              middle: p.direction ?? "",
              right: p.display,
            }))}
            empty="Nenhuma prática declarada."
          />
        )}

        {selected.has("candidato") && (
          <section className="mb-6 break-inside-avoid">
            <MicroHeader>Diferencial e observação do candidato</MicroHeader>
            <p className="text-note whitespace-pre-wrap leading-relaxed text-ink-2">
              {vm.materials.differential ?? "Nenhum diferencial escrito."}
            </p>
            <p className="text-note mt-2 whitespace-pre-wrap leading-relaxed text-ink-2">
              {vm.materials.candidateObservation ?? "Nenhuma observação escrita."}
            </p>
          </section>
        )}

        {selected.has("observacoes") && (
          <section className="mb-6">
            <MicroHeader>Observações da equipe</MicroHeader>
            {vm.notes.length === 0 ? (
              <p className="text-note text-ink-3">Nenhuma observação.</p>
            ) : (
              vm.notes.map((n) => (
                <div key={n.id} className="mb-2.5 break-inside-avoid">
                  <p className="text-note whitespace-pre-wrap leading-relaxed text-ink-2">
                    {n.body}
                  </p>
                  <p className="text-meta text-label">
                    {n.author} · {n.date}
                  </p>
                </div>
              ))
            )}
          </section>
        )}

        {assinaturas && (
          <section className="mt-10 break-inside-avoid">
            <div className="grid gap-10 sm:grid-cols-2">
              {["Coordenação pedagógica", "Direção geral"].map((role) => (
                <div key={role} className="border-t border-ink pt-1.5 text-center">
                  <p className="text-note font-semibold">{role}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="text-meta mt-8 border-t border-rule-strong pt-2.5 leading-relaxed text-label">
          Documento de circulação interna. Contém dados pessoais de candidatos —
          a impressão deve ser controlada conforme a política de privacidade do
          Liceu Jardim.
        </footer>

        <p className="text-meta mt-4 text-subtle print:hidden">
          <Link href={`/candidatos/${id}`} className="text-gold-text underline">
            Voltar à ficha
          </Link>
        </p>
      </article>
    </div>
  );
}

function PrintList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ left: string; middle: string; right: string }>;
  empty: string;
}) {
  return (
    <section className="mb-6 break-inside-avoid">
      <MicroHeader>{title}</MicroHeader>
      {rows.length === 0 ? (
        <p className="text-note text-ink-3">{empty}</p>
      ) : (
        rows.map((r, i) => (
          <div
            key={`${r.left}-${i}`}
            className="grid grid-cols-[200px_minmax(0,1fr)_100px] gap-3 border-b border-rule-weak py-1"
          >
            <span className="text-note font-semibold">{r.left}</span>
            <span className="text-note leading-snug text-ink-3">{r.middle}</span>
            <span className="text-note text-right tabular-nums">{r.right}</span>
          </div>
        ))
      )}
    </section>
  );
}
