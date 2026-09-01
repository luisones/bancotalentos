export const operationalStatusLabels: Record<string, string> = {
  novo: "Novo",
  aguardando_contato: "Aguardando contato",
  contato_realizado: "Contato realizado",
  aguardando_retorno: "Aguardando retorno",
  entrevista_a_agendar: "Entrevista a agendar",
  entrevista_agendada: "Entrevista agendada",
  aula_teste_a_agendar: "Aula-teste a agendar",
  aula_teste_agendada: "Aula-teste agendada",
  avaliacao_pendente: "Avaliação pendente",
  processo_concluido: "Processo concluído",
};

export const selectiveStatusLabels: Record<string, string> = {
  em_avaliacao: "Em avaliação",
  avancar: "Avançar",
  em_duvida: "Em dúvida",
  nao_avancar: "Não avançar",
  selecionado: "Selecionado",
  nao_selecionado: "Não selecionado",
  manter_no_banco: "Manter no banco",
};

export const talentClassificationLabels: Record<string, string> = {
  nao_classificado: "Não classificado",
  acompanhar: "Acompanhar",
  interessante: "Interessante",
  prioritario: "Prioritário",
  forte_candidato: "Forte candidato",
};

export const staffRoleLabels: Record<string, string> = {
  admin: "Administrador",
  avaliador: "Avaliador",
  consulta: "Consulta",
};

export const contactChannelLabels: Record<string, string> = {
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  email: "E-mail",
  outro: "Outro",
};

export const contactResultLabels: Record<string, string> = {
  nao_respondeu: "Não respondeu",
  contato_realizado: "Contato realizado",
  retornar_depois: "Retornar depois",
  agendado: "Agendado",
  sem_interesse: "Sem interesse",
  indisponivel: "Indisponível",
  outro: "Outro",
};

export const dimensionLabels: Record<string, string> = {
  prova_conteudo: "Prova de conteúdo",
  didatica_objetiva: "Didática objetiva",
  didatica_humana: "Didática humana",
  curriculo: "Currículo",
  video: "Vídeo",
  entrevista: "Entrevista",
  aula_teste: "Aula-teste",
  socioemocional: "Socioemocional",
};

export function labelFor(
  map: Record<string, string>,
  key: string | null | undefined,
): string {
  if (!key) return "—";
  return map[key] ?? key;
}
