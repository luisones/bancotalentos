import type { Tone } from "./tone";

/**
 * Cor do chip de campanha.
 *
 * A paleta exclui `alert` e `positive`: campanha é metadado factual, não
 * desfecho. Verde ao lado de um nome leria como aprovação.
 */
const PALETTE: Tone[] = ["navy", "gold", "neutral"];

/**
 * Atribui uma cor por campanha, garantindo que campanhas diferentes recebam
 * cores diferentes enquanto couberem na paleta.
 *
 * Por índice na ordem alfabética do slug, e não por hash: com duas campanhas,
 * um hash sobre três cores erra 1 vez em 3 — e errou, "2025 EFAF-EM" e
 * "2026 SCS" saíam as duas em gold, que é exatamente o contrário do que o chip
 * colorido existe para fazer.
 */
export function campaignToneMap(slugs: string[]): Map<string, Tone> {
  const ordered = [...new Set(slugs)].sort();
  return new Map(ordered.map((slug, i) => [slug, PALETTE[i % PALETTE.length]]));
}

/** "2026 — SCS" -> "2026 SCS": o chip é estreito e o travessão não informa. */
export function shortCampaignName(name: string | null): string {
  if (!name) return "Sem campanha";
  return name.replace(/\s*[—–-]\s*/g, " ").trim();
}
