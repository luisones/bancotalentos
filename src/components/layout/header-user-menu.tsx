"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { staffRoleLabels, labelFor } from "@/lib/labels";
import { initialsOf } from "@/lib/format";

/**
 * Menu de conta no chip de usuário da referência.
 *
 * Traz o logout, que **não existia em lugar algum do app** — é lacuna
 * funcional, não de estilo.
 */
export function HeaderUserMenu({
  name,
  role,
  canWrite,
  isAdmin,
}: {
  name: string;
  role: string;
  canWrite: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.replace("/auth/sign-in");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex cursor-pointer items-center gap-2.5 border-l border-hairline-on-navy pl-5 text-left"
        aria-label="Menu da conta"
      >
        <span className="font-heading grid size-[27px] shrink-0 place-items-center rounded-full bg-gold text-eyebrow font-bold text-navy">
          {initialsOf(name)}
        </span>
        <span className="hidden leading-[1.15] sm:block">
          <span className="text-dense block font-semibold text-white">
            {name}
          </span>
          <span className="text-eyebrow block tracking-[0.04em] text-gold">
            {labelFor(staffRoleLabels, role)}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-gold" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {isAdmin && (
          <DropdownMenuItem asChild>
            <a href="/admin/usuarios">Gerenciar usuários</a>
          </DropdownMenuItem>
        )}
        {canWrite && (
          <DropdownMenuItem asChild>
            <a href="/ranking?pendentes=1">Minhas avaliações pendentes</a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href="/admin/pesos">Como o resultado é calculado</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={isPending}>
          {isPending ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
