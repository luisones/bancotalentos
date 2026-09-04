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
  aula_teste: "Aula-teste",
  didatica_objetiva: "Didática objetiva",
  didatica_dissertativa: "Didática dissertativa",
  conteudo_dissertativa: "Conteúdo dissertativa",
  conteudo_objetiva: "Conteúdo objetiva",
  video: "Vídeo",
  // Fora de uso, mantidas para traduzir registro antigo de auditoria.
  prova_conteudo: "Prova de conteúdo",
  didatica_humana: "Didática humana",
  curriculo: "Currículo",
  entrevista: "Entrevista",
  socioemocional: "Socioemocional",
};

/** Os itens que o Resultado pondera: dois grupos e duas dimensões soltas. */
export const dimensionGroupLabels: Record<string, string> = {
  didatica: "Didática",
  conteudo: "Conteúdo",
};

/** Rótulo de um item ponderado, seja ele grupo ou dimensão solta. */
export function scoringItemLabel(code: string): string {
  return dimensionGroupLabels[code] ?? labelFor(dimensionLabels, code);
}

/**
 * Status único da candidatura. Funde os três eixos antigos; o desfecho
 * seletivo vence a etapa operacional, e a etapa só aparece enquanto não há
 * desfecho.
 */
export const candidateStatusLabels: Record<string, string> = {
  novo: "Novo",
  em_avaliacao: "Em avaliação",
  a_contatar: "A contatar",
  aula_teste_agendada: "Aula-teste agendada",
  em_duvida: "Em dúvida",
  avancar: "Avançar",
  selecionado: "Selecionado",
  nao_avancar: "Não avançar",
  manter_no_banco: "Manter no banco",
};

export const scheduleTypeLabels: Record<string, string> = {
  entrevista: "Entrevista",
  aula_teste: "Aula-teste",
};

export const scheduleStatusLabels: Record<string, string> = {
  a_agendar: "A agendar",
  agendado: "Agendado",
  realizado: "Realizado",
  faltou: "Candidato não compareceu",
  reagendar: "A reagendar",
  cancelado: "Cancelado",
};

export const auditActionLabels: Record<string, string> = {
  candidate_created: "Candidato cadastrado",
  starred_updated: "Destaque da equipe alterado",
  status_updated: "Situação alterada",
  evaluation_saved: "Avaliação registrada",
  lesson_test_saved: "Aula-teste avaliada por critérios",
  answer_override: "Nota de uma pergunta substituída",
  weights_updated: "Pesos do Resultado alterados",
  quick_note_updated: "Nota rápida alterada",
  blind_peek: "Avaliações dos colegas reveladas",
  blind_peek_dimension: "Avaliações dos colegas reveladas em uma dimensão",
  staff_created: "Pessoa incluída na equipe",
  staff_role_updated: "Papel da equipe alterado",
  staff_deactivated: "Acesso removido",
  staff_reactivated: "Acesso restaurado",
};

/**
 * O que cada critério da aula-teste afere.
 *
 * O nome sozinho não diz o que avaliar: "Presença" pode ser postura, pode ser
 * assiduidade, e dois avaliadores dando nota ao mesmo nome com perguntas
 * diferentes na cabeça produzem uma média que não significa nada. A pergunta
 * fica ao lado do campo, no momento de dar a nota.
 *
 * Chaveado por `lesson_test_criteria.code` (o slug do nome, como o seed grava).
 * Critério novo sem subtítulo aparece sem subtítulo — não some.
 */
export const lessonTestCriterionHints: Record<string, string> = {
  empatia: "Capacidade de estabelecer vínculos",
  presenca: "Mantém o controle e a atenção?",
  linguagem: "Linguagem e dress code adequados ao público-alvo",
  preparacao: "A aula é bem estruturada?",
  material: "Material (PPT, impresso) pertinente?",
  afericao: "Propõe aferir a aprendizagem?",
  clareza: "Conteúdo foi assimilado?",
  paciencia: "Demonstra ser paciente?",
  responsabilidade: "Consciência de sua responsabilidade?",
  energia: "Nível adequado ao segmento?",
  lousa: "Legível e adequada?",
  "resolucao-exercicio": "Clareza na resolução",
  voz: "Tom de voz",
  confianca: "Transmite confiança?",
};

/** Práticas didáticas autodeclaradas na planilha de inscrição. */
export const teachingPracticeLabels: Record<string, string> = {
  "afericao-constante": "Aferição constante",
  "trabalhos-em-grupo": "Trabalhos em grupo",
  seminarios: "Seminários",
  "devolutiva-individualizada": "Devolutiva individualizada",
  "trabalhos-de-pesquisa-internet": "Trabalhos de pesquisa (internet)",
  "participacao-estimulada": "Participação estimulada",
  "estimulo-ao-erro": "Estímulo ao erro",
  "filmes-e-series": "Filmes e séries",
  "diagnostico-de-pre-requisitos": "Diagnóstico de pré-requisitos",
  "lousa-interativa": "Lousa interativa",
  "analise-de-resultados-por-habilidade": "Análise de resultados por habilidade",
  "exercicios-frequentes": "Exercícios frequentes",
  "cronometro-tempo": "Cronômetro / tempo",
  sermoes: "Sermões",
  "focar-nos-interessados": "Focar nos interessados",
  "destacar-erros-publicamente": "Destacar erros publicamente",
  "corrigir-comportamento-imperceptivel":
    "Corrigir comportamento imperceptível",
  "correcao-publica": "Correção pública",
  "planejamento-de-aula": "Planejamento de aula",
};

/**
 * `teaching_practice_scores.direction` — vocabulário VERIFICADO no banco:
 * FWD (6.870 registros) e REV (6.183). A prática "FWD" soma a favor da
 * aprendizagem; "REV" tem direção invertida, isto é, quanto mais o candidato
 * declara, pior. `labelFor` devolve o valor cru para qualquer outro código,
 * em vez de esconder o que não sabemos traduzir.
 */
export const practiceDirectionLabels: Record<string, string> = {
  FWD: "Favorável à aprendizagem",
  REV: "Desfavorável à aprendizagem",
};

/** Só FWD conta como favorável. */
export function isFavorablePractice(direction: string | null): boolean {
  return direction === "FWD";
}

/**
 * Sinalizações da importação. Só o código abaixo é conhecido; os demais vêm
 * livres da planilha, então o fallback é honesto sobre não estar traduzido
 * em vez de fingir trocando underscores por espaços.
 */
export const applicationFlagLabels: Record<string, string> = {
  vinculo_prova_disciplina_diverge:
    "Disciplina da prova diferente da disciplina da candidatura",
};

export function flagLabel(code: string): string {
  return applicationFlagLabels[code] ?? `Sinalização da importação: ${code}`;
}

export const actionErrorMessages: Record<string, string> = {
  sem_permissao:
    "Seu perfil é de consulta e não registra alterações. Fale com a administração.",
  nota_invalida: "Digite um número. Use vírgula para o decimal, como 7,5.",
  nota_fora_da_faixa: "A nota precisa estar entre 0 e 10.",
  candidatura_invalida: "Esta candidatura não existe mais. Recarregue a página.",
  dimensao_invalida: "Esta dimensão não existe mais. Recarregue a página.",
  avaliacao_de_outro_avaliador:
    "Esta avaliação é de outro avaliador. Você só pode editar a sua.",
  conflito_de_versao:
    "O conteúdo mudou em outro dispositivo. Recarregue antes de salvar.",
  nota_rapida_muito_longa:
    "A nota rápida precisa caber em 120 caracteres. Ela é lida de relance no ranking — o texto longo vai em Observações internas.",
  email_dominio_invalido:
    "Só entram e-mails @liceujardim.com.br ou @liceujardim.pro.br.",
  email_duplicado: "Esta pessoa já está na equipe.",
  nome_obrigatorio: "Informe o nome completo.",
  nao_pode_alterar_a_si:
    "Você não altera o próprio acesso. Peça a outro administrador.",
  ultimo_admin:
    "Precisa restar pelo menos um administrador ativo. Promova outra pessoa antes.",
  usuario_invalido: "Esta pessoa não está mais na equipe. Recarregue a página.",
  erro_inesperado: "Não conseguimos salvar. Tente de novo.",
};

export function labelFor(
  map: Record<string, string>,
  key: string | null | undefined,
): string {
  if (!key) return "—";
  return map[key] ?? key;
}
