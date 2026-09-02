import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Escalas customizadas declaradas para o tailwind-merge.
 *
 * Sem isto ele não sabe se `text-cell` é tamanho ou cor, e trata
 * `text-cell text-primary-foreground` como conflito — descartando a COR e
 * deixando o texto herdar o escuro. Foi o que deixou o botão navy com texto
 * ilegível. Declarar as duas escalas resolve o problema na raiz, para todo
 * componente, em vez de contornar caso a caso.
 */
const FONT_SIZES = [
  "micro",
  "eyebrow",
  "meta",
  "tag",
  "note",
  "dense",
  "cell",
  "row",
  "title-sm",
  "title",
  "display-sm",
  "metric",
  "initials",
  "h1",
] as const;

const COLORS = [
  "navy",
  "navy-hover",
  "gold",
  "gold-text",
  "gold-bg",
  "gold-bg-hover",
  "gold-border",
  "ground",
  "row-hover",
  "sunken",
  "rule",
  "rule-strong",
  "rule-weak",
  "chip-bg",
  "chip-border",
  "ink",
  "ink-2",
  "ink-3",
  "label",
  "subtle",
  "faint",
  "alert",
  "alert-bg",
  "alert-border",
  "positive",
  "positive-bg",
  "positive-border",
  "info",
  "info-bg",
  "info-border",
  "neutral-fg",
  "neutral-bg",
  "neutral-border",
  "btn-border",
  "btn-hover-bg",
  "overlay",
  "hairline-on-navy",
  "nav-idle",
  "whatsapp",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
      "text-color": [{ text: [...COLORS] }],
      "bg-color": [{ bg: [...COLORS] }],
      "border-color": [{ border: [...COLORS] }],
      "border-color-l": [{ "border-l": [...COLORS] }],
      rounded: [{ rounded: ["bar", "chip", "panel"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
