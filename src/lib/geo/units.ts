/**
 * As duas unidades, com endereço e coordenada fixos.
 *
 * São dois pontos que não mudam: buscá-los de novo a cada execução do batch
 * seria uma chamada de rede para obter uma constante.
 *
 *   Santo André    Rua Silveiras, 70, Vila Guiomar
 *                  Nominatim acertou o prédio (amenity "Liceu Jardim").
 *   São Caetano    Rua Martim Francisco, 471, Santa Paula
 *                  OSM não tem o número 471; o ponto é o logradouro.
 *                  O link de rota manda o endereço ao Google Maps, que
 *                  geocodifica o prédio — aí o número entra.
 *
 * O CEP sozinho não serve: o provedor `open-cep` da BrasilAPI devolve o
 * centroide do município. SCS estava ~1 km a leste, na rua errada
 * (Edmundo Monteiro) só porque aquele era o CEP que se tinha à mão.
 *
 * Vive fora de `cep.ts` porque o mini-mapa precisa das coordenadas no NAVEGADOR,
 * e `cep.ts` carrega junto o cliente de BrasilAPI, Nominatim e OSRM — código de
 * batch que não tem o que fazer num bundle.
 */
export const UNITS = {
  santoAndre: {
    cep: "09071100",
    lat: -23.6530871,
    lng: -46.5448952,
    address: "Rua Silveiras, 70 - Vila Guiomar, Santo André - SP, 09071-100",
  },
  saoCaetano: {
    cep: "09541330",
    lat: -23.6192546,
    lng: -46.56148,
    address:
      "Rua Martim Francisco, 471 - Santa Paula, São Caetano do Sul - SP, 09541-330",
  },
} as const;
