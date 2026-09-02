import { PageHeader } from "@/components/layout/page-header";
import { StaffDirectory } from "@/components/admin/staff-directory";
import { isDirectoryStaffEmail } from "@/lib/auth/domains";
import { requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import { staffUsers } from "@/lib/db/schema";
import { asc, desc } from "drizzle-orm";

export default async function UsuariosPage() {
  const staff = await requireStaff(["admin"]);

  const rows = await db
    .select({
      id: staffUsers.id,
      name: staffUsers.name,
      email: staffUsers.email,
      role: staffUsers.role,
      active: staffUsers.active,
    })
    .from(staffUsers)
    .orderBy(desc(staffUsers.active), asc(staffUsers.name));

  const users = rows.filter((u) => isDirectoryStaffEmail(u.email));

  return (
    <div>
      <PageHeader
        breadcrumb={[
          { label: "Painel", href: "/" },
          { label: "Gerenciar usuários" },
        ]}
        title="Gerenciar usuários"
        sub="Incluir, promover e remover quem entra no Banco de Talentos. Só contas da escola."
      />
      <StaffDirectory users={users} currentUserId={staff.id} />
    </div>
  );
}
