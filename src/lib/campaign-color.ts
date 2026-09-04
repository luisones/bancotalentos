import type { Tone } from "./tone";

/**
 * Cor do chip de campanha.
 *
 * Derivada do slug por hash estável, e não por uma tabela fixa: hoje são duas
 * campanhas, e a terceira não pode nascer sem cor nem obrigar alguém a lembrar
 * de vir aqui. O mesmo slug dá sempre a mesma cor, então a associação
 * cor→campanha se aprende varrendo a lista.
 *
 * A paleta exclui `alert` e `positive`: campanha é metadado factual, não
 * desfecho. Verde ao lado de um nome leria como aprovação.
 */
const PALETTE: Tone[] = ["navy", "gold", "neutral"];

export function campaignTone(slug: string | null): Tone {
  if (!slug) return "neutral";
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** "2026 — SCS" -> "2026 SCS": o chip é estreito e o travessão não informa. */
export function shortCampaignName(name: string | null): string {
  if (!name) return "Sem campanha";
  return name.replace(/\s*[—–-]\s*/g, " ").trim();
}
