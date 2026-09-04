/**
 * Como a distância é dita, em um só lugar.
 *
 * Três telas mostram os mesmos quilômetros — a célula do Painel, o cabeçalho do
 * perfil e o mini-mapa — e cada uma tinha a sua própria frase para o mesmo
 * grau de aproximação. Um número com `≈` numa tela e sem `≈` na outra é a
 * mesma pergunta respondida de dois modos.
 *
 * A regra: `≈` marca tudo que não é rota rodoviária a partir do logradouro do
 * CEP. Sem CEP não é 0 km — é ausência, e quem chama trata `null`.
 */

const KM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** `true` quando o número é estimativa, e não rota porta a porta. */
export function isApproximate(
  mode: string | null,
  precision: string | null,
): boolean {
  return mode !== "rodoviaria" || precision !== "rua";
}

/** `≈ 12 km` | `12 km`. `null` quando não há CEP. */
export function formatKm(
  km: number | null,
  mode: string | null,
  precision: string | null,
): string | null {
  if (km === null) return null;
  return `${isApproximate(mode, precision) ? "≈ " : ""}${KM.format(km)} km`;
}

/**
 * A procedência do número, para `title` e para o rodapé do mini-mapa:
 * "distância rodoviária, a partir do logradouro do CEP".
 */
export function distanceProvenance(
  mode: string | null,
  precision: string | null,
): string {
  const route =
    mode === "rodoviaria"
      ? "distância rodoviária"
      : "linha reta (o roteador não respondeu)";

  const origin =
    precision === "rua"
      ? "a partir do logradouro do CEP"
      : precision === "bairro"
        ? "a partir do centro do bairro do CEP"
        : "a partir do centro do município — o CEP não tem logradouro";

  return `${route}, ${origin}`;
}
