"use client";

import Link from "next/link";
import { useState } from "react";
import { EvaluationForm } from "@/components/candidate/evaluation-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { peekBlindForDimension } from "@/lib/actions/evaluations";
import {
  contactChannelLabels,
  contactResultLabels,
  dimensionLabels,
  labelFor,
  operationalStatusLabels,
  selectiveStatusLabels,
  talentClassificationLabels,
} from "@/lib/labels";
import { formatScore } from "@/lib/scoring";
import { whatsAppUrl } from "@/lib/whatsapp";
import type { EvaluationRow } from "@/lib/queries/scoring-data";

type ProfileTabsProps = {
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    englishLevel: string | null;
    talentClassification: string;
    highlightedNote: string | null;
  };
  primaryApp: {
    id: string;
    operationalStatus: string;
    selectiveStatus: string;
    candidateObservation: string | null;
    differentialText: string | null;
    appliedAt: Date | null;
  } | null;
  applications: Array<{
    application: {
      id: string;
      operationalStatus: string;
      selectiveStatus: string;
      appliedAt: Date | null;
    };
    disciplineName: string | null;
    campaignName: string | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    url: string;
    description: string | null;
  }>;
  scores: {
    consolidated: number | null;
    coverage: number;
    totalDimensions: number;
    dimensionScores: Array<{ code: string; score: number | null; evaluatorCount?: number }>;
  } | null;
  evaluations: EvaluationRow[];
  subjectiveAnswers: Array<{
    answer: { answerText: string | null };
    instrument: { code: string; promptText: string | null };
  }>;
  schedules: Array<{
    type: string;
    scheduledAt: Date | null;
    location: string | null;
    status: string;
  }>;
  lessonTests: Array<{
    evaluation: { comment: string | null; evaluatedAt: Date | null };
    scores: Array<{ criterion: { name: string }; score: string }>;
  }>;
  practiceScores: Array<{ practiceCode: string; scoreRaw: string }>;
  interests: Array<{ disciplineName: string | null; segmentName: string | null }>;
  potentials: Array<{ disciplineName: string | null; segmentName: string | null }>;
  tags: Array<{ name: string }>;
  notes: Array<{
    note: { body: string; createdAt: Date; isHighlighted: boolean };
    staffName: string | null;
  }>;
  contacts: Array<{
    contact: {
      channel: string;
      result: string;
      note: string | null;
      contactedAt: Date;
    };
    staffName: string | null;
  }>;
  history: Array<{
    event: { action: string; createdAt: Date; metadata: unknown };
    staffName: string | null;
  }>;
  dimensions: Array<{ id: string; code: string; name: string }>;
  canWrite: boolean;
  staffUserId: string;
  prevId: string | null;
  nextId: string | null;
  rankingQuery: string;
};

export function ProfileTabs(props: ProfileTabsProps) {
  const [tab, setTab] = useState("resumo");
  const wa = whatsAppUrl(props.candidate.phone);

  const docsByType = {
    curriculo: props.documents.filter((d) => d.type === "curriculo"),
    video: props.documents.filter((d) => d.type === "video"),
    gravacao_entrevista: props.documents.filter((d) => d.type === "gravacao_entrevista"),
  };

  const groupedEvals = props.dimensions.map((dim) => ({
    dimension: dim,
    evals: props.evaluations.filter((e) => e.dimensionId === dim.id),
    score: props.scores?.dimensionScores.find((s) => s.code === dim.code),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--liceu-navy)]">
            {props.candidate.fullName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {props.candidate.email && <span>{props.candidate.email}</span>}
            {props.candidate.phone && (
              <span className="flex items-center gap-2">
                {props.candidate.phone}
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded bg-[#25D366] px-2 py-0.5 text-xs font-medium text-white hover:bg-[#1da851]"
                  >
                    WhatsApp
                  </a>
                )}
              </span>
            )}
            {props.candidate.city && <span>{props.candidate.city}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              {labelFor(talentClassificationLabels, props.candidate.talentClassification)}
            </Badge>
            {props.tags.map((t) => (
              <Badge key={t.name} variant="secondary">
                {t.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {props.prevId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/candidatos/${props.prevId}?${props.rankingQuery}`}>
                ← Anterior
              </Link>
            </Button>
          )}
          {props.nextId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/candidatos/${props.nextId}?${props.rankingQuery}`}>
                Próximo →
              </Link>
            </Button>
          )}
        </div>
      </div>

      {props.scores && (
        <div className="liceu-kpi-strip">
          <div className="liceu-kpi">
            <span className="liceu-kpi-label">Nota consolidada</span>
            <span className="liceu-kpi-value tabular-nums">
              {formatScore(props.scores.consolidated)}
            </span>
          </div>
          <div className="liceu-kpi">
            <span className="liceu-kpi-label">Cobertura</span>
            <span className="liceu-kpi-value tabular-nums">
              {props.scores.coverage}/{props.scores.totalDimensions}
            </span>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="w-full flex-wrap justify-start">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="candidatura">Candidatura</TabsTrigger>
          <TabsTrigger value="respostas">Respostas</TabsTrigger>
          <TabsTrigger value="curriculo">Currículo</TabsTrigger>
          <TabsTrigger value="video">Vídeo</TabsTrigger>
          <TabsTrigger value="entrevista">Entrevista</TabsTrigger>
          <TabsTrigger value="aula-teste">Aula-teste</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="observacoes">Observações</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4 space-y-4">
          {props.scores && (
            <div className="liceu-card p-4">
              <h3 className="mb-3 font-heading font-semibold text-[var(--liceu-navy)]">
                Dimensões
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {props.scores.dimensionScores.map((d) => (
                  <div
                    key={d.code}
                    className="flex justify-between border-b border-[var(--liceu-border)] py-2 text-sm"
                  >
                    <span>{labelFor(dimensionLabels, d.code)}</span>
                    <span className="tabular-nums font-medium">
                      {formatScore(d.score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {props.candidate.highlightedNote && (
            <div className="liceu-card border-l-4 border-[var(--liceu-gold)] p-4">
              <p className="text-sm">{props.candidate.highlightedNote}</p>
            </div>
          )}
          {groupedEvals.map(({ dimension, evals, score }) => (
            <div key={dimension.id} className="space-y-2">
              {props.canWrite && (
                <EvaluationForm
                  applicationId={props.primaryApp!.id}
                  dimensionId={dimension.id}
                  dimensionName={dimension.name}
                  disabled={!props.canWrite}
                />
              )}
              {evals.length > 0 && (
                <div className="liceu-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium">{dimension.name}</h4>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      Média: {formatScore(score?.score ?? null)}
                    </span>
                  </div>
                  <BlindEvalList
                    evals={evals}
                    staffUserId={props.staffUserId}
                    applicationId={props.primaryApp!.id}
                    dimensionId={dimension.id}
                    canWrite={props.canWrite}
                  />
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="candidatura" className="mt-4">
          <div className="liceu-card space-y-3 p-4">
            {props.applications.map((app) => (
              <div
                key={app.application.id}
                className="border-b border-[var(--liceu-border)] pb-3 last:border-0"
              >
                <p className="font-medium">
                  {app.disciplineName ?? "Sem disciplina"} — {app.campaignName ?? "Sem campanha"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {labelFor(operationalStatusLabels, app.application.operationalStatus)} ·{" "}
                  {labelFor(selectiveStatusLabels, app.application.selectiveStatus)}
                </p>
              </div>
            ))}
            {props.primaryApp?.candidateObservation && (
              <div>
                <h4 className="text-sm font-medium">Observação do candidato</h4>
                <p className="text-sm text-muted-foreground">
                  {props.primaryApp.candidateObservation}
                </p>
              </div>
            )}
            {props.primaryApp?.differentialText && (
              <div>
                <h4 className="text-sm font-medium">Diferencial</h4>
                <p className="text-sm text-muted-foreground">
                  {props.primaryApp.differentialText}
                </p>
              </div>
            )}
            {props.interests.length > 0 && (
              <div>
                <h4 className="text-sm font-medium">Interesses</h4>
                <ul className="text-sm text-muted-foreground">
                  {props.interests.map((i, idx) => (
                    <li key={idx}>
                      {i.disciplineName ?? "—"} / {i.segmentName ?? "—"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="respostas" className="mt-4 space-y-3">
          {props.subjectiveAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma resposta registrada.</p>
          ) : (
            props.subjectiveAnswers.map((sa, idx) => (
              <div key={idx} className="liceu-card p-4">
                <h4 className="text-sm font-medium">{sa.instrument.code}</h4>
                {sa.instrument.promptText && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    {sa.instrument.promptText}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{sa.answer.answerText ?? "—"}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="curriculo" className="mt-4">
          <DocumentList docs={docsByType.curriculo} empty="Nenhum currículo anexado." />
        </TabsContent>

        <TabsContent value="video" className="mt-4">
          <DocumentList docs={docsByType.video} empty="Nenhum vídeo anexado." />
        </TabsContent>

        <TabsContent value="entrevista" className="mt-4 space-y-4">
          <DocumentList
            docs={docsByType.gravacao_entrevista}
            empty="Nenhuma gravação de entrevista."
          />
          {props.schedules
            .filter((s) => s.type === "entrevista")
            .map((s, idx) => (
              <div key={idx} className="liceu-card p-4 text-sm">
                <p>
                  {s.scheduledAt
                    ? new Date(s.scheduledAt).toLocaleString("pt-BR")
                    : "Sem data"}{" "}
                  — {s.status}
                </p>
                {s.location && <p className="text-muted-foreground">{s.location}</p>}
              </div>
            ))}
        </TabsContent>

        <TabsContent value="aula-teste" className="mt-4 space-y-4">
          {props.lessonTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula-teste avaliada.</p>
          ) : (
            props.lessonTests.map((lt, idx) => (
              <div key={idx} className="liceu-card p-4">
                {lt.evaluation.comment && (
                  <p className="mb-3 text-sm">{lt.evaluation.comment}</p>
                )}
                <div className="grid gap-1 sm:grid-cols-2">
                  {lt.scores.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{s.criterion.name}</span>
                      <span className="tabular-nums">{formatScore(Number(s.score))}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          {props.practiceScores.length > 0 && (
            <div className="liceu-card p-4">
              <h4 className="mb-2 text-sm font-medium">Práticas didáticas (importação)</h4>
              <div className="grid gap-1 sm:grid-cols-2">
                {props.practiceScores.map((p) => (
                  <div key={p.practiceCode} className="flex justify-between text-sm">
                    <span>{p.practiceCode}</span>
                    <span className="tabular-nums">{formatScore(Number(p.scoreRaw))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contatos" className="mt-4 space-y-3">
          {props.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contato registrado.</p>
          ) : (
            props.contacts.map((c, idx) => (
              <div key={idx} className="liceu-card p-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {labelFor(contactChannelLabels, c.contact.channel)} —{" "}
                    {labelFor(contactResultLabels, c.contact.result)}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(c.contact.contactedAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                {c.contact.note && (
                  <p className="mt-1 text-muted-foreground">{c.contact.note}</p>
                )}
                {c.staffName && (
                  <p className="mt-1 text-xs text-muted-foreground">por {c.staffName}</p>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="observacoes" className="mt-4 space-y-3">
          {props.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma observação.</p>
          ) : (
            props.notes.map((n, idx) => (
              <div
                key={idx}
                className={`liceu-card p-4 text-sm ${n.note.isHighlighted ? "border-l-4 border-[var(--liceu-gold)]" : ""}`}
              >
                <p className="whitespace-pre-wrap">{n.note.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {n.staffName} — {new Date(n.note.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4 space-y-2">
          {props.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
          ) : (
            props.history.map((h, idx) => (
              <div
                key={idx}
                className="flex justify-between border-b border-[var(--liceu-border)] py-2 text-sm"
              >
                <span>
                  {h.event.action}
                  {h.staffName && (
                    <span className="text-muted-foreground"> — {h.staffName}</span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {new Date(h.event.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentList({
  docs,
  empty,
}: {
  docs: Array<{ url: string; description: string | null }>;
  empty: string;
}) {
  if (docs.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2">
      {docs.map((d, idx) => (
        <a
          key={idx}
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="liceu-card block p-4 text-sm text-[var(--liceu-navy)] hover:bg-[var(--liceu-bg)]"
        >
          {d.description ?? d.url}
        </a>
      ))}
    </div>
  );
}

function BlindEvalList({
  evals,
  staffUserId,
  applicationId,
  dimensionId,
  canWrite,
}: {
  evals: EvaluationRow[];
  staffUserId: string;
  applicationId: string;
  dimensionId: string;
  canWrite: boolean;
}) {
  const hasOwn = evals.some((e) => e.evaluatorStaffId === staffUserId);
  const hasPeeked = evals.some(
    (e) => e.evaluatorStaffId === staffUserId && e.blindPeekedAt,
  );
  const canSeePeers = hasOwn || hasPeeked;

  if (!canSeePeers) {
    return (
      <div className="text-sm text-muted-foreground">
        <p>
          {evals.length} avaliação(ões) de colegas ocultas (avaliação cega).
        </p>
        {canWrite && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => peekBlindForDimension(applicationId, dimensionId)}
          >
            Revelar avaliações dos colegas
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {evals.map((e) => (
        <li key={e.id} className="flex justify-between text-sm">
          <span>
            {e.evaluatorName}
            {e.evaluatorStaffId === staffUserId && (
              <span className="ml-1 text-xs text-muted-foreground">(você)</span>
            )}
          </span>
          <span className="tabular-nums">
            {formatScore(
              (Number(e.scoreRaw) / Number(e.scaleMax)) * 10,
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
