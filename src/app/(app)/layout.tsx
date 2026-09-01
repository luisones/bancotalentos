import { requireStaff } from "@/lib/auth/staff";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();
  return <AppShell>{children}</AppShell>;
}
