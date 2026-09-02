import Image from "next/image";
import Link from "next/link";
import { GlobalSearch } from "@/components/liceu/global-search";
import { canWrite, getStaffUser, isAdmin } from "@/lib/auth/staff";
import { HeaderMobileNav } from "./header-mobile-nav";
import { HeaderNav, type NavItem } from "./header-nav";
import { HeaderUserMenu } from "./header-user-menu";

const navItems: NavItem[] = [
  { href: "/", label: "Painel" },
  { href: "/ranking", label: "Ranking" },
  { href: "/comparar", label: "Comparar" },
];

const adminNavItems: NavItem[] = [
  { href: "/admin/candidatos/novo", label: "Novo candidato" },
  { href: "/admin/pesos", label: "Pesos" },
  { href: "/admin/usuarios", label: "Gerenciar usuários" },
];

/**
 * Header continua Server Component: os itens de admin são filtrados por papel
 * aqui, então as rotas de admin nem chegam ao bundle de um perfil `consulta`.
 * A rota ativa é resolvida por <HeaderNav>, o único pedaço que é cliente.
 */
export async function AppHeader() {
  const staff = await getStaffUser();
  const admin = staff ? isAdmin(staff) : false;
  const adminItems = admin ? adminNavItems : [];

  return (
    <header
      data-print-hidden
      className="sticky top-0 z-50 h-header border-b border-navy-hover bg-navy"
    >
      <div className="mx-auto flex h-full max-w-shell items-center justify-between gap-4 px-4 md:px-6 xl:px-[30px]">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/logo-liceu-bege.png"
              alt="Liceu Jardim"
              width={120}
              height={27}
              className="h-[27px] w-auto"
              priority
            />
          </Link>
          <span
            aria-hidden
            className="hidden h-[22px] w-px bg-hairline-on-navy lg:block"
          />
          <span className="font-heading text-eyebrow hidden shrink-0 font-bold uppercase tracking-eyebrow text-gold lg:block">
            Banco de Talentos
          </span>
          <HeaderNav items={navItems} adminItems={adminItems} />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {staff && <GlobalSearch />}
          {staff && (
            <div className="hidden md:block">
              <HeaderUserMenu
                name={staff.name}
                role={staff.role}
                canWrite={canWrite(staff)}
                isAdmin={admin}
              />
            </div>
          )}
          <HeaderMobileNav
            items={navItems}
            adminItems={adminItems}
            staff={staff ? { name: staff.name, role: staff.role } : null}
          />
        </div>
      </div>
    </header>
  );
}
