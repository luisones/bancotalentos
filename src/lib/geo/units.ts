/**
 * As duas unidades, resolvidas pela BrasilAPI em 2026-09-04 e fixadas aqui.
 *
 * São dois pontos que não mudam: buscá-los de novo a cada execução do batch
 * seria uma chamada de rede para obter uma constante.
 *
 *   Santo André    09071-100  Rua Silveiras, Vila Guiomar
 *   São Caetano    09541-030  Rua Edmundo Monteiro, Santa Paula
 *
 * Vive fora de `cep.ts` porque o mini-mapa precisa das coordenadas no NAVEGADOR,
 * e `cep.ts` carrega junto o cliente de BrasilAPI, Nominatim e OSRM — código de
 * batch que não tem o que fazer num bundle.
 */
export const UNITS = {
  santoAndre: { cep: "09071100", lat: -23.66389, lng: -46.53833 },
  saoCaetano: { cep: "09541030", lat: -23.62306, lng: -46.55111 },
} as const;
