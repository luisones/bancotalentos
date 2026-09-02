/**
 * Contrato de tom.
 *
 * O Tailwind não resolve nome de classe montado dinamicamente, então cor nunca
 * é passada como string: todo componente recebe `tone: Tone` e consulta um
 * Record estático. Isso também garante que a cor de uma barra signifique o
 * mesmo que a cor de um badge.
 */

export type Tone = "navy" | "gold" | "alert" | "positive" | "neutral";

/** Cor de tinta, sobre superfície clara. */
export const toneFg: Record<Tone, string> = {
  navy: "text-navy",
  gold: "text-gold-text",
  alert: "text-alert",
  positive: "text-positive",
  neutral: "text-neutral-fg",
};

/** Trio completo: tinta + fundo tinto + borda. Sempre consumido junto. */
export const toneTinted: Record<Tone, string> = {
  navy: "text-info bg-info-bg border-info-border",
  gold: "text-gold-text bg-gold-bg border-gold-border",
  alert: "text-alert bg-alert-bg border-alert-border",
  positive: "text-positive bg-positive-bg border-positive-border",
  neutral: "text-neutral-fg bg-neutral-bg border-neutral-border",
};

/** Preenchido. Reservado a ação irreversível e a barra de dado. */
export const toneSolid: Record<Tone, string> = {
  navy: "bg-navy text-white",
  gold: "bg-gold-text text-white",
  alert: "bg-alert text-white",
  positive: "bg-positive text-white",
  neutral: "bg-neutral-fg text-white",
};

/** Espinha de 5px do header de seção, e preenchimento de barra. */
export const toneSpine: Record<Tone, string> = {
  navy: "bg-navy",
  gold: "bg-gold-text",
  alert: "bg-alert",
  positive: "bg-positive",
  neutral: "bg-neutral-fg",
};

/** Borda esquerda de destaque (Panel accent, NoteBox). */
export const toneBorderLeft: Record<Tone, string> = {
  navy: "border-l-navy",
  gold: "border-l-gold-text",
  alert: "border-l-alert",
  positive: "border-l-positive",
  neutral: "border-l-neutral-fg",
};

/** Fundo tinto sem borda nem cor de tinta. */
export const toneBg: Record<Tone, string> = {
  navy: "bg-info-bg",
  gold: "bg-gold-bg",
  alert: "bg-alert-bg",
  positive: "bg-positive-bg",
  neutral: "bg-neutral-bg",
};
