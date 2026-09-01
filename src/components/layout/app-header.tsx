import Image from "next/image";
import Link from "next/link";
import { getStaffUser, isAdmin } from "@/lib/auth/staff";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/ranking", label: "Ranking" },
  { href: "/comparar", label: "Comparar" },
];

const adminItems = [
  { href: "/admin/candidatos/novo", label: "Novo candidato" },
  { href: "/admin/pesos", label: "Pesos" },
  { href: "/admin/usuarios", label: "Usuários" },
];

export async function AppHeader() {
  const staff = await getStaffUser();

  return (
    <header className="sticky top-0 z-50 h-[60px] border-b border-[var(--liceu-navy-hover)] bg-[var(--liceu-navy)]">
      <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-liceu-bege.png"
              alt="Liceu Jardim"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-1.5 text-sm font-medium text-[var(--liceu-gold)] transition-colors hover:bg-[var(--liceu-navy-hover)] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            {staff && isAdmin(staff) && (
              <div className="ml-2 flex items-center gap-1 border-l border-[var(--liceu-navy-hover)] pl-4">
                <span className="mr-1 text-xs uppercase tracking-wide text-[var(--liceu-gold)]/70">
                  Admin
                </span>
                {adminItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded px-3 py-1.5 text-sm font-medium text-[var(--liceu-gold)] transition-colors hover:bg-[var(--liceu-navy-hover)] hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </div>
        {staff && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--liceu-gold)] sm:inline">
              {staff.name}
            </span>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
                "bg-[var(--liceu-navy-hover)] text-[var(--liceu-gold)]",
              )}
            >
              {staff.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
