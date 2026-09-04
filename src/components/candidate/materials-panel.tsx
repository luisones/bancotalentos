import { MicroHeader, Panel } from "@/components/liceu/surface";
import type { ProfileViewModel } from "@/lib/types/candidate-profile";
import { NoteWriter } from "./note-writer";

/**
 * Currículo, vídeo e escrita, lado a lado.
 *
 * É a ordem em que o trabalho acontece: abre o currículo, abre o vídeo, escreve
 * a observação. Antes o currículo estava numa seção do acordeão e a observação
 * atrás de um diálogo com duas abas, dois cliques e um scroll de distância — o
 * avaliador perdia o que tinha acabado de ver antes de conseguir registrar.
 *
 * Diferencial e Observação são textos do CANDIDATO, não da equipe. Ficam do
 * lado direito, encostados na caixa de escrita, porque é o que mais
 * frequentemente motiva o que se escreve.
 */
export function MaterialsPanel({ vm }: { vm: ProfileViewModel }) {
  const { materials, notes, viewer } = vm;

  return (
    <Panel padding="none">
      <div className="grid gap-px bg-rule lg:grid-cols-2">
        <div className="flex flex-col gap-3 bg-card px-4 py-3.5">
          <div className="flex flex-wrap gap-2">
            <MaterialLink
              href={materials.curriculoUrl}
              label="Abrir currículo"
              missing="Currículo não anexado"
            />
            <MaterialLink
              href={materials.videoUrl}
              label="Abrir vídeo"
              missing="Vídeo não anexado"
            />
          </div>

          <CandidateText
            title="Diferencial"
            body={materials.differential}
            empty="O candidato não escreveu um diferencial."
          />
          <CandidateText
            title="Observação do candidato"
            body={materials.candidateObservation}
            empty="O candidato não deixou observação."
          />
        </div>

        <div className="bg-card px-4 py-3.5">
          <MicroHeader>Observações da equipe</MicroHeader>
          {viewer.canWrite && <NoteWriter candidateId={vm.candidateId} />}

          {notes.length === 0 ? (
            <p className="text-meta mt-2 text-subtle">
              Nenhuma observação registrada.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {notes.map((note) => (
                <li key={note.id} className="border-b border-rule-weak pb-2">
                  <p className="text-meta whitespace-pre-wrap leading-relaxed text-ink-2">
                    {note.body}
                  </p>
                  <p className="text-micro mt-0.5 text-label">
                    {note.author} · {note.date}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

/**
 * Link do material.
 *
 * A ausência é dita, não escondida: em 2026, 38 vídeos vieram como "Não
 * encontrado" e 26 como nome de arquivo. Um botão que não abre nada é pior que
 * um aviso de que não há o que abrir.
 */
function MaterialLink({
  href,
  label,
  missing,
}: {
  href: string | null;
  label: string;
  missing: string;
}) {
  if (!href) {
    return (
      <span className="text-cell rounded-chip border border-dashed border-rule-strong px-3 py-1.5 text-subtle">
        {missing}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cell rounded-chip border border-btn-border px-3 py-1.5 font-semibold text-navy hover:border-navy hover:bg-info-bg"
    >
      {label} ↗
    </a>
  );
}

function CandidateText({
  title,
  body,
  empty,
}: {
  title: string;
  body: string | null;
  empty: string;
}) {
  return (
    <div>
      <MicroHeader>{title}</MicroHeader>
      {body ? (
        <p className="text-meta whitespace-pre-wrap leading-relaxed text-ink-2">
          {body}
        </p>
      ) : (
        <p className="text-meta text-subtle">{empty}</p>
      )}
    </div>
  );
}
