"use client";

import { useState, useTransition } from "react";
import { Chip, StateBadge } from "@/components/liceu/chip";
import { Cell, DataGrid, DataGridRow } from "@/components/liceu/data-grid";
import { EmptyState, ErrorState } from "@/components/liceu/states";
import { Panel, PanelHeader } from "@/components/liceu/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addStaffUser,
  setStaffActive,
  updateStaffRole,
} from "@/lib/actions/staff";
import type { ActionErrorCode } from "@/lib/actions/result";
import type { StaffRole } from "@/lib/auth/staff";
import { actionErrorMessages, labelFor, staffRoleLabels } from "@/lib/labels";

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
};

const ROLE_OPTIONS: StaffRole[] = ["admin", "avaliador", "consulta"];

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

export function StaffDirectory({
  users,
  currentUserId,
}: {
  users: DirectoryUser[];
  currentUserId: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("avaliador");
  const [error, setError] = useState<ActionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: boolean; code?: ActionErrorCode }>,
    onOk?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) setError(result.code ?? "erro_inesperado");
        else onOk?.();
      } catch {
        setError("erro_inesperado");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Panel>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => addStaffUser({ name, email, role }),
              () => {
                setName("");
                setEmail("");
                setRole("avaliador");
              },
            );
          }}
        >
          <MicroBlock title="Incluir pessoa">
            Só e-mails da escola. O Google Workspace autentica; aqui entra quem
            pode abrir o Banco de Talentos.
          </MicroBlock>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Nome</Label>
              <Input
                id="staff-name"
                name="name"
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">E-mail</Label>
              <Input
                id="staff-email"
                name="email"
                type="email"
                value={email}
                autoComplete="email"
                placeholder="nome@liceujardim.com.br"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-role">Papel</Label>
              <select
                id="staff-role"
                name="role"
                className={selectClass}
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {labelFor(staffRoleLabels, r)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={isPending}>
              Incluir
            </Button>
          </div>
        </form>
      </Panel>

      {error && (
        <ErrorState
          title="Não foi possível atualizar"
          detail={actionErrorMessages[error]}
        />
      )}

      <Panel padding="none">
        <PanelHeader
          eyebrow="Equipe"
          title="Acesso ao sistema"
          right={`${users.length} pessoa${users.length !== 1 ? "s" : ""}`}
        />
        <div className="px-3 py-2">
          <DataGrid
            columns={[
              { key: "name", label: "Nome", width: "minmax(140px,1.1fr)" },
              { key: "email", label: "E-mail", width: "minmax(180px,1.2fr)" },
              { key: "role", label: "Papel", width: "minmax(150px,160px)" },
              { key: "status", label: "Status", width: "108px" },
              {
                key: "actions",
                label: "Ações",
                width: "minmax(120px,140px)",
                align: "end",
              },
            ]}
            empty={
              <EmptyState
                title="Ninguém na equipe ainda"
                hint="Inclua a primeira pessoa com e-mail da escola."
              />
            }
          >
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <DataGridRow
                  key={user.id}
                  tone={user.active ? (user.role === "admin" ? "navy" : "neutral") : "alert"}
                  cells={[
                    <Cell key="name" stackLabel="Nome">
                      <span className="font-semibold text-ink">{user.name}</span>
                      {isSelf && (
                        <Chip className="ml-2 align-middle">você</Chip>
                      )}
                    </Cell>,
                    <Cell key="email" muted stackLabel="E-mail">
                      {user.email}
                    </Cell>,
                    <Cell key="role" stackLabel="Papel">
                      {isSelf ? (
                        labelFor(staffRoleLabels, user.role)
                      ) : (
                        <select
                          aria-label={`Papel de ${user.name}`}
                          className={selectClass}
                          value={user.role}
                          disabled={isPending}
                          onChange={(e) =>
                            run(() =>
                              updateStaffRole({
                                staffId: user.id,
                                role: e.target.value as StaffRole,
                              }),
                            )
                          }
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {labelFor(staffRoleLabels, r)}
                            </option>
                          ))}
                        </select>
                      )}
                    </Cell>,
                    <Cell key="status" stackLabel="Status">
                      <StateBadge tone={user.active ? "positive" : "alert"} dot>
                        {user.active ? "Ativo" : "Sem acesso"}
                      </StateBadge>
                    </Cell>,
                    <Cell key="actions" align="end">
                      {isSelf ? (
                        <span className="text-meta text-subtle">—</span>
                      ) : user.active ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            run(() =>
                              setStaffActive({
                                staffId: user.id,
                                active: false,
                              }),
                            )
                          }
                        >
                          Remover
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            run(() =>
                              setStaffActive({
                                staffId: user.id,
                                active: true,
                              }),
                            )
                          }
                        >
                          Restaurar
                        </Button>
                      )}
                    </Cell>,
                  ]}
                />
              );
            })}
          </DataGrid>
        </div>
      </Panel>
    </div>
  );
}

function MicroBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-heading text-title-sm font-bold text-navy">{title}</p>
      <p className="text-dense mt-1 text-muted-foreground">{children}</p>
    </div>
  );
}
