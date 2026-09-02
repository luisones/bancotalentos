/** Iniciais para os blocos navy/gold da referência. */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ý]/.test(p));
  if (parts.length === 0) return "—";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return dateFmt.format(value);
}

/** "há 3 dias" / "hoje". Usado nas linhas-resumo das seções. */
export function relativeDays(value: Date | null | undefined): string | null {
  if (!value) return null;
  const days = Math.floor((Date.now() - value.getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}
