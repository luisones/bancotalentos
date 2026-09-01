# Banco de Talentos Docentes

Plataforma interna do Liceu Jardim para gestão de candidatos docentes.

## Stack

- Next.js 16 + Drizzle + Neon Postgres + Managed Better Auth (Google)

## Setup

```bash
cp .env.example .env.local
# Preencher DATABASE_URL, NEON_AUTH_*, etc.

npm install
npm run db:migrate
npm run db:seed
npm run db:ingest   # planilha anonimizada em dados-brutos/
npm run dev
```

## Neon

- Projeto: `bancotalentos` (`super-frost-69304525`)
- Org: `org-proud-cloud-20519926`
- Branch: `br-nameless-dream-awpm9ea0`

## Documentação

Ver [`docs/plano/README.md`](docs/plano/README.md) para o plano de implementação e protocolo de etapas.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Testes de scoring |
| `npm run db:seed` | Catálogo + admin inicial |
| `npm run db:ingest` | Importar planilha 2025 |

## Primeiro acesso

1. Admin seed: `luis.ribeiro@liceujardim.pro.br`
2. Login com Google Workspace da escola
3. E-mail deve estar em `staff_users` e domínio permitido
