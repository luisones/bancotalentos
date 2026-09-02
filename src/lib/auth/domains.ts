const DEFAULT_DOMAINS = "liceujardim.com.br,liceujardim.pro.br";

const SYNTHETIC_DOMAINS = new Set([
  "lesson-test.ingest",
  "exemplo.invalid",
  "internal",
]);

function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? DEFAULT_DOMAINS)
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeStaffEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmailDomain(email: string): boolean {
  const domain = normalizeStaffEmail(email).split("@")[1];
  return Boolean(domain && allowedDomains().includes(domain));
}

/** Contas sintéticas da ingestão — não entram no diretório nem no login. */
export function isSyntheticStaffEmail(email: string): boolean {
  const domain = normalizeStaffEmail(email).split("@")[1];
  return Boolean(domain && SYNTHETIC_DOMAINS.has(domain));
}

export function isDirectoryStaffEmail(email: string): boolean {
  return isAllowedEmailDomain(email) && !isSyntheticStaffEmail(email);
}

export function staffNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
