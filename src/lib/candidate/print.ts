/**
 * Seções que podem entrar no documento impresso.
 *
 * Encolheu junto com a página. Saíram "Entrevista e aula-teste" (agendamentos
 * deixaram de existir na interface), "Histórico de candidaturas", "Contatos" e
 * "Registro de auditoria" — nenhum deles é mostrado em tela, e imprimir o que
 * não se pode conferir na tela é como o papel deixa de bater com o sistema.
 */
export const PRINT_SECTIONS = [
  { id: "notas", label: "Notas e resultado", defaultOn: true },
  { id: "materiais", label: "Currículo e vídeo", defaultOn: true },
  { id: "respostas", label: "Respostas dissertativas", defaultOn: false },
  { id: "praticas", label: "Práticas declaradas", defaultOn: false },
  { id: "candidato", label: "Diferencial e observação do candidato", defaultOn: true },
  { id: "observacoes", label: "Observações da equipe", defaultOn: false },
] as const;

export type PrintSectionId = (typeof PRINT_SECTIONS)[number]["id"];
