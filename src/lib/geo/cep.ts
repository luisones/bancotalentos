/**
 * Geocodificação de CEP e distância até as unidades.
 *
 * Nada aqui é chamado no caminho de um request. O batch
 * `scripts/backfill/distancias.ts` roda estas funções uma vez por CEP distinto
 * e grava em `cep_locations` / `cep_distances`; a aplicação só faz JOIN nessas
 * tabelas. BrasilAPI, Nominatim e OSRM são serviços públicos, gratuitos e sem
 * SLA — depender deles para renderizar uma página seria trocar uma tabela por
 * uma falha intermitente.
 */

export type CepPrecision = "rua" | "bairro" | "cidade";
export type DistanceMode = "rodoviaria" | "linha_reta";

export type GeoPoint = { lat: number; lng: number };

export type CepLocation = GeoPoint & {
  city: string | null;
  uf: string | null;
  precision: CepPrecision;
  source: string;
};

/**
 * As duas unidades, resolvidas pela BrasilAPI em 2026-09-04 e fixadas aqui.
 * São dois pontos que não mudam: buscá-los de novo a cada execução do batch
 * seria uma chamada de rede para obter uma constante.
 *
 *   Santo André    09071-100  Rua Silveiras, Vila Guiomar
 *   São Caetano    09541-030  Rua Edmundo Monteiro, Santa Paula
 */
export const UNITS = {
  santoAndre: { cep: "09071100", lat: -23.66389, lng: -46.53833 },
  saoCaetano: { cep: "09541030", lat: -23.62306, lng: -46.55111 },
} as const;

const BRASIL_API = "https://brasilapi.com.br/api/cep/v2";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OSRM = "https://router.project-osrm.org/route/v1/driving";

/** Nominatim exige identificação; sem isso a chamada é recusada. */
const USER_AGENT = "bancotalentos-liceujardim/1.0 (backfill de distancias)";

/**
 * A política de uso do Nominatim público é de 1 requisição por segundo. Um
 * portão global serializa as chamadas em vez de confiar na concorrência de
 * quem chama — o custo é ~1s por CEP num batch que roda uma vez.
 */
const NOMINATIM_INTERVAL_MS = 1100;
let nominatimGate: Promise<void> = Promise.resolve();

function throttleNominatim<T>(task: () => Promise<T>): Promise<T> {
  const result = nominatimGate.then(task);
  nominatimGate = result.then(
    () => new Promise((r) => setTimeout(r, NOMINATIM_INTERVAL_MS)),
    () => new Promise((r) => setTimeout(r, NOMINATIM_INTERVAL_MS)),
  );
  return result;
}

async function fetchJson(url: string, timeoutMs = 12_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type BrasilApiCep = {
  city?: string;
  state?: string;
  street?: string;
  neighborhood?: string;
  service?: string;
  location?: {
    coordinates?: { latitude?: string | number; longitude?: string | number };
  };
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type NominatimHit = { lat?: string; lon?: string };

/**
 * Busca estruturada no Nominatim. `street`/`city`/`state` separados acertam
 * muito mais que uma string única, porque o parser de texto livre erra em
 * logradouro brasileiro com preposição ("Rua Alexandrino da Silveira Bueno").
 */
async function nominatimSearch(
  params: Record<string, string>,
): Promise<GeoPoint | null> {
  const query = new URLSearchParams({
    ...params,
    format: "json",
    limit: "1",
    countrycodes: "br",
  });
  const hits = await throttleNominatim(
    () => fetchJson(`${NOMINATIM}?${query}`) as Promise<NominatimHit[] | null>,
  );
  const hit = hits?.[0];
  const lat = toNumber(hit?.lat);
  const lng = toNumber(hit?.lon);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

/**
 * O CEP vira endereço na BrasilAPI e endereço vira coordenada no Nominatim.
 *
 * A coordenada que a própria BrasilAPI devolve NÃO serve para distância: o
 * provedor `open-cep` entrega o centroide do município. Medido: os CEPs de
 * Santana, Cambuci e Parque Fongaro — norte, centro e sul de São Paulo —
 * voltavam todos em -23.5475,-46.63611, e portanto com a mesma distância até
 * as unidades. Ela fica como último recurso, e aí a precisão é 'cidade'.
 *
 * A cascata degrada de forma explícita: rua -> bairro -> cidade. Quem lê a
 * distância vê em qual desses degraus ela foi calculada.
 */
export async function geocodeCep(cep: string): Promise<CepLocation | null> {
  const data = (await fetchJson(`${BRASIL_API}/${cep}`)) as BrasilApiCep | null;
  if (!data) return null;

  const city = data.city ?? null;
  const uf = data.state ?? null;
  if (!city) return null;
  const base = { city, state: uf ?? "", country: "Brazil" };

  if (data.street) {
    const point = await nominatimSearch({ ...base, street: data.street });
    if (point) {
      return { ...point, city, uf, precision: "rua", source: "nominatim:rua" };
    }
  }

  if (data.neighborhood) {
    const point = await nominatimSearch({
      ...base,
      street: data.neighborhood,
    });
    if (point) {
      return {
        ...point,
        city,
        uf,
        precision: "bairro",
        source: "nominatim:bairro",
      };
    }
  }

  const cityPoint = await nominatimSearch(base);
  if (cityPoint) {
    return {
      ...cityPoint,
      city,
      uf,
      precision: "cidade",
      source: "nominatim:cidade",
    };
  }

  const lat = toNumber(data.location?.coordinates?.latitude);
  const lng = toNumber(data.location?.coordinates?.longitude);
  if (lat === null || lng === null) return null;
  return {
    lat,
    lng,
    city,
    uf,
    precision: "cidade",
    source: data.service ? `brasilapi:${data.service}` : "brasilapi",
  };
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

type OsrmResponse = { code?: string; routes?: Array<{ distance?: number }> };

/** Distância rodoviária em km, ou `null` se o roteador não responder. */
export async function roadDistanceKm(
  from: GeoPoint,
  to: GeoPoint,
): Promise<number | null> {
  const url = `${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  const data = (await fetchJson(url)) as OsrmResponse | null;
  if (!data || data.code !== "Ok") return null;
  const meters = data.routes?.[0]?.distance;
  if (typeof meters !== "number" || !Number.isFinite(meters)) return null;
  return meters / 1000;
}

export type CepDistances = {
  kmSantoAndre: number;
  kmSaoCaetano: number;
  mode: DistanceMode;
};

/**
 * Rodoviária quando o OSRM responde para AS DUAS unidades; linha reta quando
 * qualquer uma falha. Misturar os dois modos numa linha só produziria duas
 * colunas incomparáveis entre si.
 */
export async function distancesFor(point: GeoPoint): Promise<CepDistances> {
  const [sa, scs] = await Promise.all([
    roadDistanceKm(point, UNITS.santoAndre),
    roadDistanceKm(point, UNITS.saoCaetano),
  ]);

  if (sa !== null && scs !== null) {
    return { kmSantoAndre: sa, kmSaoCaetano: scs, mode: "rodoviaria" };
  }

  return {
    kmSantoAndre: haversineKm(point, UNITS.santoAndre),
    kmSaoCaetano: haversineKm(point, UNITS.saoCaetano),
    mode: "linha_reta",
  };
}

/** 8 dígitos, sem hífen. `4296000` é `04296000`; o que não fecha 8 é descartado. */
export function normalizeCep(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 0 || digits.length > 8) return null;
  return digits.padStart(8, "0");
}

/** `09071100` -> `09071-100`, só para exibição. */
export function formatCep(cep: string | null): string | null {
  if (!cep || cep.length !== 8) return cep;
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}
