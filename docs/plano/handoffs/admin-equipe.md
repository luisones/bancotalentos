# Handoff — diretório da equipe

Gerado em 2026-09-02.

## O que mudou

- Rebeca Fazzani (`rebeca.fazzani@liceujardim.com.br`) entra como **admin**.
- `/admin/usuarios` deixa de ser uma lista morta: incluir, promover (papel) e remover/restaurar acesso. Só e-mails da escola. Ninguém altera o próprio acesso; o último admin não pode ser rebaixado nem removido.
- Botão **Gerenciar usuários** no menu de conta e no bloco Admin do header (desktop e mobile).
- Limpeza das contas sintéticas da ingestão (`at-2025-*@lesson-test.ingest`, `aval-*@exemplo.invalid`). As 18 aulas-teste passam a apontar para Luis e Renato, com `external_ref` (`AT-…`).
- A ingestão deixa de criar essas contas: liga pelo e-mail da escola ou pelo nome; senão usa `ingest@internal`.

## Arquivos

- `drizzle/0003_staff_directory.sql`
- `src/lib/auth/domains.ts`, `src/lib/actions/staff.ts`
- `src/components/admin/staff-directory.tsx`
- `src/app/(app)/admin/usuarios/page.tsx`
- `src/components/layout/app-header.tsx`, `header-user-menu.tsx`
- `scripts/ingest/load-campaign.ts`, `scripts/seed.ts`

## Comandos

```bash
npx drizzle-kit migrate
npm test
```

## Débitos

- Remover é desativar (`active=false`), não apagar a linha — avaliações e notas continuam atribuídas.
- Conta `ingest@internal` continua no banco e não aparece no diretório.
