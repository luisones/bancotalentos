/**
 * Retorno tipado das server actions.
 *
 * Casos ESPERADOS (sem permissão, valor fora da faixa, conflito de versão)
 * voltam como `{ ok: false, code }` para a UI poder reagir por código, nunca
 * comparando o texto da mensagem. `throw` fica reservado a defeito de
 * programação, onde o error boundary é o lugar certo.
 */

export type ActionErrorCode =
  | "sem_permissao"
  | "nota_invalida"
  | "nota_fora_da_faixa"
  | "candidatura_invalida"
  | "dimensao_invalida"
  | "avaliacao_de_outro_avaliador"
  | "conflito_de_versao"
  | "nota_rapida_muito_longa"
  | "email_dominio_invalido"
  | "email_duplicado"
  | "nome_obrigatorio"
  | "nao_pode_alterar_a_si"
  | "ultimo_admin"
  | "usuario_invalido"
  | "erro_inesperado";

export type ActionOk<T = undefined> = { ok: true; data: T };
export type ActionErr = {
  ok: false;
  code: ActionErrorCode;
  /** Campo do formulário a destacar, quando o erro é de um campo específico. */
  field?: string;
};

export type ActionResult<T = undefined> = ActionOk<T> | ActionErr;

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function err(code: ActionErrorCode, field?: string): ActionErr {
  return { ok: false, code, ...(field ? { field } : {}) };
}
