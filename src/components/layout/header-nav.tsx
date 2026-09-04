"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

/**
 * Só a LISTA de nav é cliente, não o header.
 *
 * O header continua Server Component (mantém getStaffUser e filtra os itens por
 * papel no servidor, então as rotas de admin nem são nomeadas no bundle de um
 * usuário `consulta`). Aqui entram apenas os itens já filtrados como props —
 * nenhum dado cruza a fronteira.
 *
 * "Admin" é um item de mesmo estilo que os demais, sem divisória nem rótulo
 * dourado à frente: o grupo antigo desenhava uma seção inteira do header para
 * duas telas que quase ninguém abre.
 */
export function HeaderNav({
  items,
  adminItems,
}: {
  items: NavItem[];
  adminItems: NavItem[];
}) {
  const pathname = usePathname();
  const adminActive = adminItems.some((item) => isActive(pathname, item.href));

  return (
    <nav className="hidden items-center gap-5 md:flex">
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}

      {adminItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "text-dense inline-flex cursor-pointer items-center gap-1 pb-[3px] transition-colors",
              adminActive
                ? "font-semibold text-white shadow-[inset_0_-2px_0_var(--liceu-gold)]"
                : "text-nav-idle hover:text-white",
            )}
          >
            Admin
            <ChevronDown className="size-3.5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {adminItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
