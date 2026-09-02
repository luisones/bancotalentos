import Link from "next/link";
import { Cell, DataGrid, DataGridRow } from "@/components/liceu/data-grid";
import { Chip, StateBadge } from "@/components/liceu/chip";
import { FieldBlock, FieldGrid } from "@/components/liceu/field-block";
import { NoteBox } from "@/components/liceu/meter";
import { Section } from "@/components/liceu/section-accordion";
import { EmptyState, RestrictedState } from "@/components/liceu/states";
import { MicroHeader } from "@/components/liceu/surface";
import { Button } from "@/components/ui/button";
import type { ProfileViewModel } from "@/lib/types/candidate-profile";
import { ContactDialog, NoteDialog, StatusDialog, TagAdder } from "./crm-actions";
import { DimensionEvaluation } from "./dimension-evaluation";

/*
  Dez seções. Cada uma declara escopo (chip da candidatura quando é escopo
  candidatura), tom de espinha semântico, linha-resumo que entrega o essencial
  SEM abrir, e as ações que pertencem àquela informação.
*/

export function AvaliacaoSection({ vm }: { vm: ProfileViewModel }) {
  const { evaluation: e, focused, viewer } = vm;

  return (
    <Section
      id="secao-avaliacao"
      tone="navy"
      title="Avaliação e resultado"
      scope={focused?.label}
      badge={
        !viewer.canWrite
          ? undefined
          : e.ownPending.length > 0
            ? { label: `${e.ownPending.length} pendentes suas`, tone: "alert" }
            : e.coverage > 0
              ? { label: "Sua avaliação completa", tone: "positive" }
              : undefined
      }
      summary={e.summary}
    >
      {!focused ? (
        <EmptyState
          title="Este candidato está no banco sem candidatura."
          hint="Ele pode permanecer no banco e ser considerado em campanhas futuras."
        />
      ) : e.dimensions.length === 0 ? (
        <EmptyState
          title="Nenhuma dimensão configurada."
          hint="Cadastre as dimensões e os pesos para o consolidado existir."
          action={{ label: "Ver pesos", href: "/admin/pesos" }}
        />
      ) : (
        <>
          {e.blindPartial && (
            <NoteBox
              tone="alert"
              source="comparação entre o consolidado visível e o real"
              className="mb-4"
            >
              Você ainda não avaliou este candidato. Enquanto isso, o resultado
              exibido considera apenas as notas que você pode ver. Ele vai mudar
              quando as avaliações dos colegas forem reveladas.
            </NoteBox>
          )}
          {!viewer.canWrite && (
            <RestrictedState
              className="mb-4"
              reason="Seu perfil é de consulta: você vê os registros mas não avalia."
            />
          )}
          <div className="flex flex-col">
            {e.dimensions.map((d) => (
              <DimensionEvaluation
                key={d.dimensionId}
                dimension={d}
                applicationId={focused.applicationId}
                canWrite={viewer.canWrite}
              />
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

export function MateriaisSection({ vm }: { vm: ProfileViewModel }) {
  const { materials: m, focused } = vm;
  const missing = [
    !m.hasCurriculo ? { label: "Sem currículo", tone: "alert" as const } : null,
    !m.hasVideo ? { label: "Sem vídeo", tone: "alert" as const } : null,
  ].filter(Boolean)[0];

  return (
    <Section
      id="secao-materiais"
      tone="positive"
      title="Currículo, vídeo e materiais"
      scope={focused?.label}
      badge={missing ?? undefined}
      summary={m.summary}
    >
      {m.documents.length === 0 ? (
        <EmptyState
          title="Nenhum material anexado a esta candidatura."
          hint="Currículo e vídeo pertencem à candidatura, não ao candidato — as outras candidaturas podem ter material próprio."
        />
      ) : (
        <ul className="flex flex-col">
          {m.documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-weak py-2.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-row font-semibold">{doc.typeLabel}</p>
                <p className="text-note text-muted-foreground">
                  {doc.description ?? "Sem descrição"}
                  {doc.date ? ` · anexado em ${doc.date}` : ""}
                </p>
              </div>
              {doc.url ? (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tag font-semibold text-gold-text hover:underline"
                >
                  {doc.openLabel} ↗
                </a>
              ) : (
                <span className="text-tag text-alert">
                  Link indisponível
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function RespostasSection({ vm }: { vm: ProfileViewModel }) {
  const { answers: a, focused } = vm;

  return (
    <Section
      id="secao-respostas"
      tone="navy"
      title="Respostas às perguntas do processo"
      scope={focused?.label}
      summary={a.summary}
    >
      {a.items.length === 0 ? (
        <EmptyState
          title="Nenhuma resposta registrada."
          hint="Esta candidatura veio de cadastro manual ou de uma importação sem as perguntas do processo."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {a.items.map((item) => (
            <div key={item.id}>
              <MicroHeader>{item.order}</MicroHeader>
              <p className="text-cell mb-2 font-semibold text-navy">
                {item.prompt}
              </p>
              <p className="text-dense max-w-prose whitespace-pre-wrap leading-relaxed text-ink-2">
                {item.text}
              </p>
              <p className="text-meta mt-1.5 text-subtle">{item.scaleNote}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function EtapasSection({ vm }: { vm: ProfileViewModel }) {
  const { stages: s, focused, candidateId, viewer } = vm;

  return (
    <Section
      id="secao-etapas"
      tone="positive"
      title="Entrevista e aula-teste"
      scope={focused?.label}
      badge={s.badge}
      summary={s.summary}
    >
      {s.schedules.length === 0 && s.lessonTests.length === 0 ? (
        <EmptyState
          title="Nenhuma entrevista ou aula-teste registrada."
          hint="Nem agendamento, nem avaliação."
          {...(viewer.canWrite && focused
            ? {}
            : {})}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {s.schedules.length > 0 && (
            <div>
              <MicroHeader>Agendamentos</MicroHeader>
              <DataGrid
                columns={[
                  { key: "t", label: "Etapa", width: "minmax(140px,1fr)" },
                  { key: "d", label: "Data", width: "130px" },
                  { key: "l", label: "Local", width: "minmax(140px,1fr)" },
                  { key: "s", label: "Situação", width: "180px", align: "end" },
                ]}
              >
                {s.schedules.map((sc) => (
                  <DataGridRow
                    key={sc.id}
                    tone={sc.overdue ? "alert" : undefined}
                    cells={[
                      <Cell key="t">{sc.typeLabel}</Cell>,
                      <Cell key="d" numeric muted stackLabel="Data">
                        {sc.date}
                      </Cell>,
                      <Cell key="l" muted stackLabel="Local">
                        {sc.location ?? "—"}
                      </Cell>,
                      <Cell key="s" align="end" stackLabel="Situação">
                        {sc.overdue ? (
                          <StateBadge tone="alert">Data vencida</StateBadge>
                        ) : (
                          sc.statusLabel
                        )}
                      </Cell>,
                    ]}
                  />
                ))}
              </DataGrid>
            </div>
          )}

          {s.lessonTests.map((lt) => (
            <div key={lt.id}>
              <MicroHeader>
                Aula-teste · {lt.evaluatorName} · {lt.date}
              </MicroHeader>
              {lt.comment && (
                <p className="text-dense mb-3 max-w-prose leading-relaxed text-ink-2">
                  {lt.comment}
                </p>
              )}
              <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {lt.criteria.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-baseline justify-between gap-3 border-b border-rule-weak py-1"
                  >
                    <span className="text-cell min-w-0">{c.name}</span>
                    <span
                      data-numeric
                      className="text-cell shrink-0 font-semibold text-navy"
                    >
                      {c.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {viewer.canWrite && focused && (
            <ContactDialog
              candidateId={candidateId}
              applicationId={focused.applicationId}
              trigger={
                <Button variant="outline" size="sm" className="self-start">
                  Registrar contato sobre o agendamento
                </Button>
              }
            />
          )}
        </div>
      )}
    </Section>
  );
}

export function PraticasSection({ vm }: { vm: ProfileViewModel }) {
  const { practices: p, focused } = vm;

  return (
    <Section
      id="secao-praticas"
      tone="neutral"
      title="Práticas pedagógicas declaradas"
      scope={focused?.label}
      badge={p.items.length > 0 ? { label: "Importado", tone: "neutral" } : undefined}
      summary={p.summary}
    >
      {p.items.length === 0 ? (
        <EmptyState
          title="Nenhuma prática declarada."
          hint="As 19 práticas vêm da planilha de inscrição; candidaturas manuais não têm este dado."
        />
      ) : (
        <>
          <DataGrid
            columns={[
              { key: "n", label: "Prática", width: "minmax(220px,1fr)" },
              { key: "d", label: "Direção", width: "minmax(180px,0.6fr)" },
              { key: "s", label: "Valor", width: "90px", align: "end", numeric: true },
            ]}
          >
            {p.items.map((item) => (
              <DataGridRow
                key={item.code}
                cells={[
                  <Cell key="n">{item.label}</Cell>,
                  <Cell key="d" muted stackLabel="Direção">
                    {item.direction ?? "—"}
                  </Cell>,
                  <Cell key="s" align="end" numeric stackLabel="Valor">
                    {item.score}
                  </Cell>,
                ]}
              />
            ))}
          </DataGrid>
          <p className="text-meta mt-3 text-subtle">
            Estas práticas alimentam a dimensão Didática objetiva. Não há edição
            de práticas nesta versão.
          </p>
        </>
      )}
    </Section>
  );
}

export function CandidaturaSection({ vm }: { vm: ProfileViewModel }) {
  const { application: a, focused, candidateId, viewer } = vm;

  if (!focused) {
    return (
      <Section
        id="secao-candidatura"
        tone="navy"
        title="Dados da candidatura"
        summary={[{ text: "sem candidatura registrada" }]}
      >
        <EmptyState
          title="Este candidato está no banco sem candidatura."
          hint="Ele pode permanecer no banco e ser considerado em campanhas futuras."
        />
      </Section>
    );
  }

  return (
    <Section
      id="secao-candidatura"
      tone="navy"
      title="Dados da candidatura"
      scope={focused.label}
      badge={
        a.activeFlags.length > 0
          ? {
              label: `${a.activeFlags.length} ${a.activeFlags.length === 1 ? "sinalização" : "sinalizações"} da importação`,
              tone: "alert",
            }
          : undefined
      }
      summary={a.summary}
    >
      <FieldGrid>
        <FieldBlock title="Inscrição" items={a.enrollment} />
        {a.interests.length > 0 && (
          <div>
            <MicroHeader>Interesses declarados</MicroHeader>
            <div className="flex flex-wrap gap-2">
              {a.interests.map((i) => (
                <Chip key={i}>{i}</Chip>
              ))}
            </div>
          </div>
        )}
        {/* `potentials` era recebido como prop e nunca renderizado. */}
        {a.potentials.length > 0 && (
          <div>
            <MicroHeader>Potencial para outras disciplinas</MicroHeader>
            <div className="flex flex-wrap gap-2">
              {a.potentials.map((i) => (
                <Chip key={i}>{i}</Chip>
              ))}
            </div>
          </div>
        )}
        <div>
          <MicroHeader>Etiquetas</MicroHeader>
          {a.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {a.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          ) : (
            <p className="text-note text-subtle">Nenhuma etiqueta.</p>
          )}
          {viewer.canWrite && (
            <TagAdder
              candidateId={candidateId}
              applicationId={focused.applicationId}
            />
          )}
        </div>
      </FieldGrid>

      {a.activeFlags.length > 0 && (
        <div className="mt-5">
          <MicroHeader>Sinalizações da importação</MicroHeader>
          <ul className="flex flex-col gap-1.5">
            {a.activeFlags.map((f) => (
              <li key={f} className="text-dense flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-alert"
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.observation && (
        <div className="mt-5">
          <MicroHeader>Observação do candidato</MicroHeader>
          <p className="text-dense max-w-prose whitespace-pre-wrap leading-relaxed text-ink-2">
            {a.observation}
          </p>
        </div>
      )}
      {a.differential && (
        <div className="mt-5">
          <MicroHeader>Diferencial declarado</MicroHeader>
          <p className="text-dense max-w-prose whitespace-pre-wrap leading-relaxed text-ink-2">
            {a.differential}
          </p>
        </div>
      )}

      {viewer.canWrite && (
        <div className="mt-6 flex flex-wrap gap-2">
          <StatusDialog
            candidateId={candidateId}
            applicationId={focused.applicationId}
            applicationLabel={focused.label}
            kind="selective"
            current={a.selectiveStatus}
            trigger={
              <Button variant="outline" size="sm">
                Alterar situação seletiva
              </Button>
            }
          />
          <StatusDialog
            candidateId={candidateId}
            applicationId={focused.applicationId}
            applicationLabel={focused.label}
            kind="operational"
            current={a.operationalStatus}
            trigger={
              <Button variant="outline" size="sm">
                Alterar etapa operacional
              </Button>
            }
          />
        </div>
      )}
    </Section>
  );
}

/**
 * Histórico de candidaturas — escopo PESSOA, sempre cross-campanha, nunca
 * filtrado. É o cumprimento das regras 3 e 13, e torna possível a leitura
 * longitudinal que hoje é impossível na UI.
 */
export function HistoricoSection({ vm }: { vm: ProfileViewModel }) {
  const { history: h, focused, candidateId, viewer } = vm;
  if (h.rows.length <= 1) return null;

  return (
    <Section
      id="secao-historico"
      tone="gold"
      title="Histórico de candidaturas"
      badge={
        h.campaignCount > 1
          ? { label: `${h.campaignCount} campanhas`, tone: "gold" }
          : undefined
      }
      summary={h.summary}
    >
      <DataGrid
        columns={[
          { key: "c", label: "Campanha", width: "minmax(170px,1fr)" },
          { key: "d", label: "Disciplina", width: "minmax(140px,0.7fr)" },
          { key: "i", label: "Inscrição", width: "110px" },
          { key: "r", label: "Resultado", width: "120px", align: "end", numeric: true },
          { key: "s", label: "Situação", width: "140px", align: "end" },
          { key: "f", label: "", width: "120px", align: "end" },
        ]}
      >
        {h.rows.map((row) => (
          <DataGridRow
            key={row.applicationId}
            tone={row.applicationId === focused?.applicationId ? "navy" : undefined}
            cells={[
              <Cell key="c">
                <span className="font-semibold">{row.campaignName}</span>
              </Cell>,
              <Cell key="d" muted stackLabel="Disciplina">
                {row.disciplineName}
              </Cell>,
              <Cell key="i" numeric muted stackLabel="Inscrição">
                {row.appliedAt}
              </Cell>,
              <Cell key="r" align="end" stackLabel="Resultado">
                <span data-numeric className="font-semibold">
                  {row.score}
                </span>{" "}
                <span data-numeric className="text-meta text-subtle">
                  {row.coverage}
                </span>
              </Cell>,
              <Cell key="s" align="end" muted stackLabel="Situação">
                {row.selectiveLabel}
              </Cell>,
              <Cell key="f" align="end">
                {row.applicationId === focused?.applicationId ? (
                  <span className="text-meta text-subtle">em foco</span>
                ) : (
                  <Link
                    href={`/candidatos/${candidateId}?candidatura=${row.applicationId}`}
                    scroll={false}
                    className="text-tag font-semibold text-gold-text hover:underline"
                  >
                    Colocar em foco →
                  </Link>
                )}
              </Cell>,
            ]}
          />
        ))}
      </DataGrid>
      {viewer.canWrite && (
        <p className="text-meta mt-3 text-subtle">
          O histórico nunca é sobrescrito por campanhas futuras. Para alterar a
          situação de uma candidatura, coloque-a em foco.
        </p>
      )}
    </Section>
  );
}

export function ContatosSection({ vm }: { vm: ProfileViewModel }) {
  const { contacts: c, candidateId, focused, viewer } = vm;

  return (
    <Section
      id="secao-contatos"
      tone="positive"
      title="Contatos"
      badge={c.badge}
      summary={c.summary}
    >
      {viewer.canWrite && (
        <ContactDialog
          candidateId={candidateId}
          applicationId={focused?.applicationId}
          trigger={
            <Button variant="outline" size="sm" className="mb-4">
              Registrar contato
            </Button>
          }
        />
      )}
      {c.items.length === 0 ? (
        <EmptyState title="Nenhum contato registrado." />
      ) : (
        <DataGrid
          columns={[
            { key: "d", label: "Data", width: "110px" },
            { key: "c", label: "Canal", width: "120px" },
            { key: "r", label: "Resultado", width: "minmax(160px,0.7fr)" },
            { key: "n", label: "Anotação", width: "minmax(200px,1fr)" },
            { key: "a", label: "Por", width: "150px", align: "end" },
          ]}
        >
          {c.items.map((item) => (
            <DataGridRow
              key={item.id}
              cells={[
                <Cell key="d" numeric muted>
                  {item.date}
                </Cell>,
                <Cell key="c" stackLabel="Canal">
                  {item.channel}
                </Cell>,
                <Cell key="r" stackLabel="Resultado">
                  {item.result}
                </Cell>,
                <Cell key="n" muted stackLabel="Anotação">
                  {item.note ?? "—"}
                </Cell>,
                <Cell key="a" align="end" muted stackLabel="Por">
                  {item.author}
                </Cell>,
              ]}
            />
          ))}
        </DataGrid>
      )}
    </Section>
  );
}

export function ObservacoesSection({ vm }: { vm: ProfileViewModel }) {
  const { notes: n, candidateId, focused, viewer } = vm;

  return (
    <Section
      id="secao-observacoes"
      tone="gold"
      title="Observações internas"
      badge={n.badge}
      summary={n.summary}
    >
      {viewer.canWrite && (
        <NoteDialog
          candidateId={candidateId}
          applicationId={focused?.applicationId}
          trigger={
            <Button variant="outline" size="sm" className="mb-4">
              Escrever observação
            </Button>
          }
        />
      )}
      {n.items.length === 0 ? (
        <EmptyState
          title="Nenhuma observação."
          hint="Texto livre, do tamanho que precisar. Para uma linha curta sempre visível — inclusive no ranking — use a nota rápida no topo da ficha."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {n.items.map((item) => (
            <li
              key={item.id}
              className={
                item.highlighted
                  ? "border-l-[3px] border-l-gold-text bg-gold-bg px-3 py-2.5"
                  : "border-b border-rule-weak pb-3 last:border-0"
              }
            >
              <p className="text-dense max-w-prose whitespace-pre-wrap leading-relaxed text-ink-2">
                {item.body}
              </p>
              <p className="text-meta mt-1.5 text-subtle">
                {item.author} · {item.date}
                {item.highlighted && " · fixada no topo"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function AuditoriaSection({ vm }: { vm: ProfileViewModel }) {
  const { audit: a } = vm;

  return (
    <Section
      id="secao-auditoria"
      tone="neutral"
      title="Registro de auditoria"
      badge={a.badge}
      summary={a.summary}
    >
      {a.items.length === 0 ? (
        <EmptyState
          title="Nenhum evento registrado."
          hint="Alterações de situação, avaliações e acessos a avaliação cega aparecem aqui."
        />
      ) : (
        <DataGrid
          columns={[
            { key: "d", label: "Data", width: "150px" },
            { key: "a", label: "Evento", width: "minmax(220px,1fr)" },
            { key: "w", label: "Por", width: "minmax(150px,0.5fr)", align: "end" },
          ]}
        >
          {a.items.map((item) => (
            <DataGridRow
              key={item.id}
              tone={item.isPeek ? "alert" : undefined}
              cells={[
                <Cell key="d" numeric muted>
                  {item.date}
                </Cell>,
                <Cell key="a" stackLabel="Evento">
                  <span className="font-semibold">{item.action}</span>
                  {item.detail && (
                    <span className="text-note block text-muted-foreground">
                      {item.detail}
                    </span>
                  )}
                </Cell>,
                <Cell key="w" align="end" muted stackLabel="Por">
                  {item.author}
                </Cell>,
              ]}
            />
          ))}
        </DataGrid>
      )}
    </Section>
  );
}
