import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { isAllowedEmailDomain } from "@/lib/auth/domains";
import { db, staffUsers } from "@/lib/db";

export type StaffRole = "admin" | "avaliador" | "consulta";

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
};

export { isAllowedEmailDomain };

export async function getSession() {
  const { data } = await auth.getSession();
  return data ?? null;
}

export async function getStaffUser(): Promise<StaffUser | null> {
  const session = await getSession();
  if (!session?.user?.email) return null;

  const email = session.user.email.toLowerCase();
  if (!isAllowedEmailDomain(email)) return null;

  const [staff] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.email, email))
    .limit(1);

  if (!staff || !staff.active) return null;

  if (!staff.neonAuthUserId && session.user.id) {
    await db
      .update(staffUsers)
      .set({
        neonAuthUserId: session.user.id,
        name: staff.name || session.user.name || email,
        updatedAt: new Date(),
      })
      .where(eq(staffUsers.id, staff.id));
  }

  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
  };
}

export async function requireStaff(
  roles?: StaffRole[],
): Promise<StaffUser> {
  const staff = await getStaffUser();
  if (!staff) redirect("/sem-acesso");
  if (roles && !roles.includes(staff.role)) redirect("/sem-acesso");
  return staff;
}

export function canWrite(staff: StaffUser): boolean {
  return staff.role === "admin" || staff.role === "avaliador";
}

export function isAdmin(staff: StaffUser): boolean {
  return staff.role === "admin";
}
