"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

/**
 * Só a LISTA de nav é cliente, não o header.
 *
 * O header continua Server Component (mantém getStaffUser e filtra os itens de
 * admin por papel no servidor, então as rotas de admin nem são nomeadas no
 * bundle de um usuário `consulta`). Aqui entram apenas os itens já filtrados
 * como props — nenhum dado cruza a fronteira, ~1KB de JS.
 *
 * Descartado: passar `pathname` de um layout (não existe em Server Components
 * do App Router) e prop `active` por página (drifta no primeiro route novo).
 */
export function HeaderNav({
  items,
  adminItems,
}: {
  items: NavItem[];
  adminItems: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-5 md:flex">
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
      {adminItems.length > 0 && (
        <div className="flex items-center gap-5 border-l border-hairline-on-navy pl-5">
          <span className="text-micro font-bold uppercase tracking-eyebrow text-gold">
            Admin
          </span>
          {adminItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      )}
    </nav>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-dense pb-[3px] transition-colors",
        active
          ? "font-semibold text-white shadow-[inset_0_-2px_0_var(--liceu-gold)]"
          : "text-nav-idle hover:text-white",
      )}
    >
      {item.label}
    </Link>
  );
}

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
