import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintPicker } from "@/components/candidate/print-picker";
import { DefinitionList } from "@/components/liceu/field-block";
import { MicroHeader } from "@/components/liceu/surface";
import { requireStaff } from "@/lib/auth/staff";
import { buildProfileViewModel } from "@/lib/candidate/view-model";
import { PRINT_SECTIONS, type PrintSectionId } from "@/lib/candidate/print";
import { getCandidateProfile } from "@/lib/queries/candidate";
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

  const profile = await getCandidateProfile(id, staff.id);
  if (!profile) notFound();

  const vm = buildProfileViewModel({
    profile,
    staff,
    focusedApplicationId:
      typeof query.candidatura === "string" ? query.candidatura : undefined,
  });

  const raw = typeof query.secoes === "string" ? query.secoes : null;
  const selected = new Set<PrintSectionId>(
    raw
      ? (raw.split(",").filter((s) =>
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
            <p className="font-semibold text-navy">
              Banco de Talentos Docentes
            </p>
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
              { label: "E-mail", value: vm.identity.email ?? "—" },
              { label: "Telefone", value: vm.identity.phone ?? "—" },
              { label: "Situação seletiva", value: vm.identity.selective.label },
              { label: "Etapa operacional", value: vm.identity.operational.label },
              {
                label: "Selo de talento",
                value: vm.identity.classification.label,
              },
            ]}
          />
        </section>

        {selected.has("avaliacao") && (
          <section className="mb-6 break-inside-avoid">
            <MicroHeader>Avaliação e resultado</MicroHeader>
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th className="text-micro py-1.5 text-left uppercase tracking-micro text-label">
                    Dimensão
                  </th>
                  <th className="text-micro py-1.5 text-left uppercase tracking-micro text-label">
                    Origem
                  </th>
                  <th className="text-micro py-1.5 text-right uppercase tracking-micro text-label">
                    Nota
                  </th>
                </tr>
              </thead>
              <tbody>
                {vm.evaluation.dimensions.map((d) => (
                  <tr key={d.dimensionId} className="border-b border-rule-weak">
                    <td className="text-cell py-1.5">{d.name}</td>
                    <td className="text-note py-1.5 text-ink-3">
                      {/* Avaliação cega não revelada NUNCA entra no papel. */}
                      {d.hiddenPeers > 0
                        ? "Avaliações ocultas (avaliação cega)"
                        : d.originLabel}
                    </td>
                    <td className="text-cell py-1.5 text-right font-semibold tabular-nums">
                      {d.hiddenPeers > 0 ? "—" : d.display}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-note mt-2 text-ink-3">
              Resultado consolidado{" "}
              <strong className="font-semibold">{vm.kpis[0]?.value}</strong>{" "}
              sobre {vm.evaluation.coverage} de {vm.evaluation.totalDimensions}{" "}
              dimensões. Dimensão ausente não conta como zero.
            </p>
          </section>
        )}

        {selected.has("materiais") && (
          <PrintList
            title="Currículo, vídeo e materiais"
            rows={vm.materials.documents.map((d) => ({
              left: d.typeLabel,
              middle: d.description ?? "",
              right: d.date ?? "",
            }))}
            empty="Nenhum material anexado."
          />
        )}

        {selected.has("respostas") && (
          <section className="mb-6">
            <MicroHeader>Respostas às perguntas do processo</MicroHeader>
            {vm.answers.items.length === 0 ? (
              <p className="text-note text-ink-3">Nenhuma resposta registrada.</p>
            ) : (
              vm.answers.items.map((a) => (
                <div key={a.id} className="mb-3 break-inside-avoid">
                  <p className="text-cell font-semibold text-navy">{a.prompt}</p>
                  <p className="text-note whitespace-pre-wrap leading-relaxed text-ink-2">
                    {a.text}
                  </p>
                </div>
              ))
            )}
          </section>
        )}

        {selected.has("etapas") && (
          <PrintList
            title="Entrevista e aula-teste"
            rows={vm.stages.schedules.map((s) => ({
              left: s.typeLabel,
              middle: s.location ?? "",
              right: `${s.date} · ${s.statusLabel}`,
            }))}
            empty="Nenhuma entrevista ou aula-teste registrada."
          />
        )}

        {selected.has("praticas") && (
          <PrintList
            title="Práticas pedagógicas declaradas"
            rows={vm.practices.items.map((p) => ({
              left: p.label,
              middle: p.direction ?? "",
              right: p.score,
            }))}
            empty="Nenhuma prática declarada."
          />
        )}

        {selected.has("historico") && vm.history.rows.length > 1 && (
          <PrintList
            title="Histórico de candidaturas"
            rows={vm.history.rows.map((r) => ({
              left: `${r.campaignName} · ${r.disciplineName}`,
              middle: r.selectiveLabel,
              right: `${r.score} (${r.coverage})`,
            }))}
            empty=""
          />
        )}

        {selected.has("contatos") && (
          <PrintList
            title="Contatos"
            rows={vm.contacts.items.map((c) => ({
              left: c.date,
              middle: `${c.channel} · ${c.result}${c.note ? ` — ${c.note}` : ""}`,
              right: c.author,
            }))}
            empty="Nenhum contato registrado."
          />
        )}

        {selected.has("observacoes") && (
          <section className="mb-6">
            <MicroHeader>Observações internas</MicroHeader>
            {vm.notes.items.length === 0 ? (
              <p className="text-note text-ink-3">Nenhuma observação.</p>
            ) : (
              vm.notes.items.map((n) => (
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

        {selected.has("auditoria") && (
          <PrintList
            title="Registro de auditoria"
            rows={vm.audit.items.map((a) => ({
              left: a.date,
              middle: `${a.action}${a.detail ? ` — ${a.detail}` : ""}`,
              right: a.author,
            }))}
            empty="Nenhum evento registrado."
          />
        )}

        {assinaturas && (
          <section className="mt-10 break-inside-avoid">
            <div className="grid gap-10 sm:grid-cols-2">
              {["Coordenação pedagógica", "Direção geral"].map((role) => (
                <div
                  key={role}
                  className="border-t border-ink pt-1.5 text-center"
                >
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
          {vm.evaluation.dimensions.some((d) => d.hiddenPeers > 0) &&
            " Avaliações sob avaliação cega não reveladas foram omitidas deste documento."}
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
        empty ? (
          <p className="text-note text-ink-3">{empty}</p>
        ) : null
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
