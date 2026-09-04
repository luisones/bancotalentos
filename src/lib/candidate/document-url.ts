/**
 * Se a URL de um documento abre alguma coisa.
 *
 * `e_url = NAO` na planilha de origem virou URL que não é URL: em 2026, 38
 * vídeos vieram como "Não encontrado" e 26 como nome de arquivo. Um link para
 * isso não abre nada, e um botão que não abre nada é pior que o aviso de que
 * não há o que abrir — por isso a checagem, e não a confiança no campo.
 *
 * Vive fora de `view-model.ts` porque o redirecionador de documento
 * (`/api/documento/...`) precisa da mesma regra: se os dois divergirem, o
 * Painel mostra um link que devolve 404.
 */
export function isOpenableUrl(url: string | null | undefined): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}

/** A URL quando ela abre; `null` quando não. */
export function openableUrl(url: string | null | undefined): string | null {
  return isOpenableUrl(url) ? url! : null;
}

/**
 * Um id de rota é um uuid.
 *
 * Sem esta checagem, `/api/painel/nao-e-uuid` chega ao Postgres e volta como
 * 500 não tratado. Uma rota que recebe id pelo caminho recebe o que o
 * navegador quiser mandar.
 */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export type DocumentKind = "curriculo" | "video";

export function isDocumentKind(value: string): value is DocumentKind {
  return value === "curriculo" || value === "video";
}

/**
 * O caminho do redirecionador. A URL real não viaja no payload do Painel: 707
 * candidaturas × 2 endereços seriam ~110KB de RSC para links que quase nunca
 * são clicados.
 */
export function documentHref(
  applicationId: string,
  kind: DocumentKind,
): string {
  return `/api/documento/${applicationId}/${kind}`;
}
