"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  isAllowedEmailDomain,
  isDirectoryStaffEmail,
  normalizeStaffEmail,
} from "@/lib/auth/domains";
import { requireStaff, type StaffRole } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import { auditEvents, staffUsers } from "@/lib/db/schema";
import { err, ok, type ActionResult } from "./result";

const ROLES: StaffRole[] = ["admin", "avaliador", "consulta"];

function isStaffRole(value: string): value is StaffRole {
  return (ROLES as string[]).includes(value);
}

function revalidateStaffViews() {
  revalidatePath("/(app)/admin/usuarios", "page");
  revalidatePath("/(app)", "layout");
}

async function activeAdminIds(): Promise<string[]> {
  const rows = await db
    .select({ id: staffUsers.id })
    .from(staffUsers)
    .where(and(eq(staffUsers.role, "admin"), eq(staffUsers.active, true)));
  return rows.map((r) => r.id);
}

export async function addStaffUser(input: {
  name: string;
  email: string;
  role: StaffRole;
}): Promise<ActionResult> {
  const actor = await requireStaff(["admin"]);

  const name = input.name.replace(/\s+/g, " ").trim();
  if (name.length < 2) return err("nome_obrigatorio", "name");

  const email = normalizeStaffEmail(input.email);
  if (!email || !isAllowedEmailDomain(email) || !isDirectoryStaffEmail(email)) {
    return err("email_dominio_invalido", "email");
  }
  if (!isStaffRole(input.role)) return err("usuario_invalido", "role");

  const [existing] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.email, email))
    .limit(1);

  if (existing) {
    if (existing.active) return err("email_duplicado", "email");
    await db
      .update(staffUsers)
      .set({
        name,
        role: input.role,
        active: true,
        updatedAt: new Date(),
      })
      .where(eq(staffUsers.id, existing.id));
    await db.insert(auditEvents).values({
      staffId: actor.id,
      action: "staff_reactivated",
      entityType: "staff_user",
      entityId: existing.id,
      metadata: { email, role: input.role },
    });
    revalidateStaffViews();
    return ok();
  }

  const [created] = await db
    .insert(staffUsers)
    .values({
      email,
      name,
      role: input.role,
      active: true,
    })
    .returning({ id: staffUsers.id });

  await db.insert(auditEvents).values({
    staffId: actor.id,
    action: "staff_created",
    entityType: "staff_user",
    entityId: created.id,
    metadata: { email, role: input.role },
  });
  revalidateStaffViews();
  return ok();
}

export async function updateStaffRole(input: {
  staffId: string;
  role: StaffRole;
}): Promise<ActionResult> {
  const actor = await requireStaff(["admin"]);
  if (!isStaffRole(input.role)) return err("usuario_invalido", "role");
  if (input.staffId === actor.id) return err("nao_pode_alterar_a_si");

  const [target] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, input.staffId))
    .limit(1);
  if (!target || !isDirectoryStaffEmail(target.email)) {
    return err("usuario_invalido");
  }
  if (target.role === input.role) return ok();

  if (target.role === "admin" && target.active && input.role !== "admin") {
    const admins = await activeAdminIds();
    if (admins.length <= 1) return err("ultimo_admin");
  }

  await db
    .update(staffUsers)
    .set({ role: input.role, updatedAt: new Date() })
    .where(eq(staffUsers.id, target.id));
  await db.insert(auditEvents).values({
    staffId: actor.id,
    action: "staff_role_updated",
    entityType: "staff_user",
    entityId: target.id,
    metadata: { de: target.role, para: input.role, email: target.email },
  });
  revalidateStaffViews();
  return ok();
}

export async function setStaffActive(input: {
  staffId: string;
  active: boolean;
}): Promise<ActionResult> {
  const actor = await requireStaff(["admin"]);
  if (input.staffId === actor.id) return err("nao_pode_alterar_a_si");

  const [target] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, input.staffId))
    .limit(1);
  if (!target || !isDirectoryStaffEmail(target.email)) {
    return err("usuario_invalido");
  }
  if (target.active === input.active) return ok();

  if (target.role === "admin" && target.active && !input.active) {
    const admins = await activeAdminIds();
    if (admins.length <= 1) return err("ultimo_admin");
  }

  await db
    .update(staffUsers)
    .set({ active: input.active, updatedAt: new Date() })
    .where(eq(staffUsers.id, target.id));
  await db.insert(auditEvents).values({
    staffId: actor.id,
    action: input.active ? "staff_reactivated" : "staff_deactivated",
    entityType: "staff_user",
    entityId: target.id,
    metadata: { email: target.email },
  });
  revalidateStaffViews();
  return ok();
}
