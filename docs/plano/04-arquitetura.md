# Arquitetura

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15 App Router, React 19, Tailwind 4 |
| UI | shadcn/ui (tema Liceu) |
| ORM | Drizzle |
| DB | Neon Postgres |
| Auth | Managed Better Auth (`better_auth`) + Google OAuth |
| Deploy | Vercel |

## Pastas

```
app/
  (auth)/sign-in/          # Login Google
  (app)/                   # Rotas protegidas
    page.tsx               # Dashboard
    ranking/
    candidatos/[id]/
    comparar/
    admin/
  api/auth/[...path]/      # Neon Auth handler
lib/
  auth/server.ts           # createNeonAuth
  auth/client.ts
  auth/staff.ts            # requireStaff, gate allowlist
  db/
    index.ts
    schema/
  scoring.ts               # Consolidado + cobertura
  whatsapp.ts              # Normalização telefone
scripts/
  ingest/2025-efaf-em.ts
  seed.ts
drizzle/                   # Migrations SQL
docs/plano/                # Este plano
public/                    # Logos Liceu
```

## Fluxo de auth

1. Usuário clica "Entrar com Google"
2. Neon Auth valida OAuth
3. Middleware/app verifica domínio `@liceujardim.*`
4. `staff_users` deve ter email ativo
5. Se não: sign-out + página "Sem acesso"
6. Papel (`admin`/`avaliador`/`consulta`) vem de `staff_users`

## MCP Neon

Agente usa MCP para: `create_project`, `apply_migration`, `run_sql`, `provision_neon_auth`, branches dev.

## Segurança MVP

- Sem RLS; `requireStaff(role)` em Server Actions
- `DATABASE_URL` só servidor
- `robots: noindex`
- Audit log em alterações sensíveis
- Planilhas IDENTIFICADO exigem `--allow-pii`; xlsx/csv ficam em `tmp/` (gitignored)
- Lote de OBS → nota rápida: `audit_events.metadata` só tem contagens, nunca o texto
