"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NoteWriter } from "./note-writer";

/**
 * O roteiro da entrevista, ao lado da caixa de escrever.
 *
 * O botão não abre um formulário de entrevista porque não existe entrevista
 * para preencher: não há resposta do candidato para registrar campo a campo. O
 * que existe é o que a equipe observou — e isso já tem lugar, que é
 * "Observações da equipe". Este diálogo é o roteiro E aquele campo, juntos: ler
 * a pergunta e escrever o que ela revelou sem fechar nada no meio.
 *
 * Duas colunas em tela larga, com a caixa de escrita FIXA: rolar as oito
 * perguntas não pode empurrar para fora da tela o único lugar onde se registra.
 */
export function InterviewDialog({
  candidateId,
  applicationId,
  candidateName,
  canWrite,
}: {
  candidateId: string;
  applicationId?: string;
  candidateName: string;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Entrevista
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-4xl gap-3 overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Entrevista · {candidateName}</DialogTitle>
          <DialogDescription>
            O roteiro e as observações da equipe, no mesmo lugar — o que você
            escrever aqui vai para Observações da equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Script />

          <div className="lg:sticky lg:top-0 lg:self-start">
            <p className="text-micro mb-1 uppercase tracking-micro text-label">
              Observações da equipe
            </p>
            {canWrite ? (
              <>
                <NoteWriter
                  candidateId={candidateId}
                  applicationId={applicationId}
                />
                <p className="text-meta mt-2 text-subtle">
                  Cada observação salva vira um registro com seu nome e a data.
                  Pode salvar várias durante a conversa.
                </p>
              </>
            ) : (
              <p className="text-meta text-subtle">
                Seu perfil é de consulta e não registra observações.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Pergunta e, abaixo, como puxá-la. A abordagem é metade do valor. */
type Question = { ask: string; how?: string };

const QUESTIONS: Question[] = [
  {
    ask: "Revisitando a aula que você ministrou, o que você fez ou deixou de fazer que faria diferente?",
  },
  {
    ask: "Por que o aluno gosta da sua aula?",
    how: 'Entrevistamos todos os alunos da escola em que você dá aula e eles nos disseram que a sua aula é a que eles mais gostam. Por que eles responderam isso?',
  },
  {
    ask: "Por que o aluno gosta de você?",
    how: 'Entrevistamos todos os alunos da escola em que você dá aula e eles nos disseram que você é o professor de quem eles mais gostam. Por que eles responderam isso?',
  },
  {
    ask: "O que você faz que encanta o aluno?",
    how: "Qual o diferencial que só você consegue trazer para conseguir esse encantamento?",
  },
  {
    ask: "Por que o tema tem relevância?",
    how: "Pensando em um colégio de altíssimo desempenho com foco em grandes vestibulares, como o tema da sua aula se encaixa na jornada do aluno?",
  },
  {
    ask: "O que você geralmente faz entre uma explicação e outra?",
    how: 'O que você faz além do "entenderam? posso continuar?"',
  },
  { ask: "Você é legal? Por quê?" },
  {
    ask: 'Qual é, usualmente, o "gancho" das suas aulas?',
    how: "O que você prepara ou busca para todas as suas aulas como estratégia para despertar a curiosidade e prender a atenção dos alunos num conteúdo novo?",
  },
];

function Script() {
  return (
    <div className="flex flex-col gap-4">
      <section className="border-l-[3px] border-l-navy bg-info-bg px-3.5 py-3">
        <p className="text-micro mb-1.5 uppercase tracking-micro text-label">
          O que a entrevista procura
        </p>
        <p className="text-note leading-relaxed text-ink-2">
          Detectar e confirmar <strong className="font-semibold">
            compatibilidade com a escola
          </strong>{" "}
          — e ela não é só de técnica, didática e domínio de conteúdo.
        </p>
        <p className="text-note mt-1.5 leading-relaxed text-ink-2">
          Um professor, acima de tudo, precisa ser especialista em{" "}
          <strong className="font-semibold">formar vínculos de confiança</strong>
          , engajar e, em última instância,{" "}
          <strong className="font-semibold">encantar</strong> seus alunos para
          que eles desejem aprender.
        </p>
        <p className="text-note mt-1.5 leading-relaxed text-ink-2">
          As perguntas existem para levar a conversa aos pontos onde esse
          alinhamento de cultura entre escola e candidato vem à tona. Não são um
          questionário — são ganchos.
        </p>
      </section>

      <section>
        <p className="text-micro mb-2 uppercase tracking-micro text-label">
          Sugestões de perguntas
        </p>
        <ol className="flex flex-col gap-2.5">
          {QUESTIONS.map((question, index) => (
            <li key={question.ask} className="flex gap-2.5">
              <span
                aria-hidden
                className="font-heading text-meta mt-0.5 w-4 shrink-0 text-right font-bold text-gold-text"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-cell font-semibold text-navy">
                  {question.ask}
                </p>
                {question.how && (
                  <p className="text-meta mt-0.5 leading-relaxed text-ink-3">
                    {question.how}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-l-[3px] border-l-gold-text bg-gold-bg px-3.5 py-3">
        <p className="text-note leading-relaxed text-ink-2">
          Se possível, <strong className="font-semibold">dê um feedback</strong>{" "}
          sobre a aula dada. Como o professor recebe o feedback é, em si, uma das
          coisas que a entrevista mede.
        </p>
      </section>
    </div>
  );
}
