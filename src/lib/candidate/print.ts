/** Seções que podem entrar no documento impresso. */
export const PRINT_SECTIONS = [
  { id: "avaliacao", label: "Avaliação e resultado", defaultOn: true },
  { id: "materiais", label: "Currículo, vídeo e materiais", defaultOn: true },
  { id: "respostas", label: "Respostas do processo", defaultOn: false },
  { id: "etapas", label: "Entrevista e aula-teste", defaultOn: true },
  { id: "praticas", label: "Práticas pedagógicas", defaultOn: false },
  { id: "historico", label: "Histórico de candidaturas", defaultOn: true },
  { id: "contatos", label: "Contatos", defaultOn: false },
  { id: "observacoes", label: "Observações internas", defaultOn: false },
  { id: "auditoria", label: "Registro de auditoria", defaultOn: false },
] as const;

export type PrintSectionId = (typeof PRINT_SECTIONS)[number]["id"];
