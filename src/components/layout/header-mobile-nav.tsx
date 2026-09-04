"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { labelFor, staffRoleLabels } from "@/lib/labels";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isActive, type NavItem } from "./header-nav";

/**
 * Navegação mobile.
 *
 * Antes deste componente não havia navegação NENHUMA abaixo de md — a nav era
 * `hidden md:flex` e nada a substituía. Um painel serve nav e conta juntos, e
 * é por isso que ele e o menu de usuário do desktop são componentes separados
 * em vez de um só responsivo.
 */
export function HeaderMobileNav({
  items,
  adminItems,
  staff,
}: {
  items: NavItem[];
  adminItems: NavItem[];
  staff: { name: string; role: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="grid size-10 place-items-center text-gold"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-card">
          <div className="flex h-header items-center justify-between bg-navy px-4">
            <span className="font-heading text-eyebrow font-bold uppercase tracking-eyebrow text-gold">
              Banco de Talentos
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="grid size-10 place-items-center text-gold"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto">
            {items.map((item) => (
              <MobileLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            ))}

            {/* Lista plana: no celular não há espaço para um submenu, e a
                faixa "Admin" separava duas telas do resto sem informar nada
                que o próprio rótulo do item já não diga. */}
            {adminItems.map((item) => (
              <MobileLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </nav>

          {staff && (
            <div className="border-t border-rule-strong px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="font-heading grid size-9 shrink-0 place-items-center rounded-full bg-navy text-cell font-bold text-gold">
                  {initialsOf(staff.name)}
                </span>
                <span className="min-w-0">
                  <span className="text-cell block truncate font-semibold">
                    {staff.name}
                  </span>
                  <span className="text-meta block text-gold-text">
                    {labelFor(staffRoleLabels, staff.role)}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  router.replace("/auth/sign-in");
                }}
                className="font-heading text-cell mt-3 min-h-11 w-full cursor-pointer rounded-chip border border-btn-border font-semibold text-navy"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MobileLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-row flex min-h-12 items-center border-b border-rule px-4",
        active
          ? "border-l-[3px] border-l-gold-text bg-gold-bg font-semibold text-navy"
          : "text-ink",
      )}
    >
      {item.label}
    </Link>
  );
}
