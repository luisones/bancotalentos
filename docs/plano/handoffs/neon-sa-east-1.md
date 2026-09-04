# Handoff — migração Neon para AWS São Paulo

**Status:** Cutover concluído; projeto legado vivo até OK explícito para apagar.

## Feito

### Neon

- Snapshot pré-migração: `snap-crimson-art-awwrn4es` (`pre-migration-sa-east-1`) no projeto antigo
- Projeto novo: **`bancotalentos-sa`** / `fancy-snow-03616478`
  - Região: **`aws-sa-east-1`**
  - Postgres 18
  - Autoscaling 0,25–2 CU, `suspend_timeout_seconds: 0`
  - Branch: `main` / `br-frosty-band-acu6sfjl`
- Managed Better Auth provisionado (`better_auth`)
  - Base URL: `https://ep-frosty-recipe-acik0xew.neonauth.sa-east-1.aws.neon.tech/neondb/auth`
  - Trusted domains: `https://bancodetalentos-lj.vercel.app`, `https://*.vercel.app`
  - Google OAuth: **shared** (credenciais Neon). Custom client do projeto antigo não foi migrado (secret redacted no MCP)
- Dump/restore `public` + `drizzle` apenas (sem `neon_auth`)
- `staff_users.neon_auth_user_id` anulado (rebind no próximo login por e-mail)
- Projeto antigo renomeado para `bancotalentos-us-east-1-legacy` (`super-frost-69304525`)

### Contagens (origem = destino)

| Tabela | N |
|--------|---|
| candidates | 692 |
| applications | 707 |
| staff_users | 4 |
| campaigns | 2 |
| evaluations | 1 |
| imported_dimension_scores | 1707 |
| subjective_answers | 2748 |
| llm_evaluations | 6325 |
| teaching_practice_scores | 13053 |
| drizzle.__drizzle_migrations | 11 |
| neon_auth.user (destino) | 0 (esperado) |

Índice `llm_evaluations_answer_id_idx` confirmado via EXPLAIN (Bitmap Index Scan).

### Vercel

- Env Production + Preview atualizados: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`
- [`vercel.json`](../../vercel.json): `"regions": ["gru1"]`
- Deploy produção: `dpl_CSPTDhcCfcNkxQWmbBVuMrZC984A`
- Header `x-vercel-id: gru1::…` em `/` e `/auth/sign-in`
- Inspect: funções `λ` em **gru1**

### Latência (TCP 5432 a partir de SP)

- Neon SA pooler: ~19 ms
- Neon US pooler (legado): ~152 ms

### Local

- `.env.local` aponta para SA
- `npx vitest run` — 25 testes OK
- `npx tsc --noEmit` OK
- Query live: 707 applications

## Intervenção manual pendente

### 1. Google OAuth custom (recomendado para produção)

Hoje o Auth novo usa Google **shared**. Para reusar o client da escola:

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Cliente `17464952355-imkli3u546nf5t996kdjcb3gh4mitr38…`
3. Em **Authorized redirect URIs**, adicione (mantenha a URI antiga até o soak):

```text
https://ep-frosty-recipe-acik0xew.neonauth.sa-east-1.aws.neon.tech/neondb/auth/callback/google
```

4. Cole o **Client secret** no chat (ou configure em Neon Console → `bancotalentos-sa` → Auth → Google) para eu rodar `add_auth_oauth_provider`.

### 2. Smoke humano de login

1. Abrir https://bancodetalentos-lj.vercel.app/auth/sign-in
2. Entrar com Google Workspace (`@liceujardim.*`)
3. Confirmar Painel com ~707 candidaturas, uma ficha e uma escrita CRM (pode reverter)

### 3. Apagar o legado

Só após 24–48 h estáveis e OK explícito:

```text
delete_project super-frost-69304525
```

Rollback até lá: reverter as 3 env vars na Vercel para o host `ep-floral-bird-awj4sqh2…us-east-1` e redeploy.

## Arquivos

- [`vercel.json`](../../vercel.json)
- [`README.md`](../../README.md)
- `.env.local` (gitignored)
