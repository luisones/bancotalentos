import { requireStaff } from "@/lib/auth/staff";
import { staffRoleLabels, labelFor } from "@/lib/labels";
import { db } from "@/lib/db";
import { staffUsers } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";

export default async function UsuariosPage() {
  await requireStaff(["admin"]);

  const users = await db
    .select()
    .from(staffUsers)
    .orderBy(asc(staffUsers.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--liceu-navy)]">
          Usuários da equipe
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestão de acesso ao Banco de Talentos
        </p>
      </div>

      <div className="liceu-card overflow-hidden">
        <table className="liceu-table w-full">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{labelFor(staffRoleLabels, user.role)}</td>
                  <td>
                    <Badge variant={user.active ? "default" : "secondary"}>
                      {user.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
