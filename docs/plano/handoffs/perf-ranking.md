# Handoff — ranking travado + auditoria de fluxo de dados

**Status:** Concluído

## Causa do “Rendering…” infinito

A página `/ranking` é um Server Component que só entrega HTML depois de `getRankingRows()`. Essa função fazia N+1 via HTTP Neon:

- 267 candidaturas
- para cada uma, `buildDimensionScoresForApplication` disparava ~6 queries sequenciais (dimensões, pesos, avaliações, importados, aula-teste)

Resultado: ~1.600 round-trips HTTP contra um compute Neon de **0,25 CU** (sem autoscaling). O RSC nunca terminava; o Next ficava em “Rendering”.

Evidência no banco (seq scans): `dimensions` 3218, `applications` 2006, `imported_dimension_scores` / `weight_configs` ~1070 cada — batem com várias tentativas de abrir o ranking.

## Princípio da auditoria (compute limitado)

Não empurrar consolidado para SQL/materialized view: o ranking é **por avaliador** (modo cego) e “dimensão ausente ≠ zero”. O barato no Neon é **poucas queries grandes** + consolidar em memória.

Driver `neon-http`: cada `await` é um HTTP. `db.batch()` empacota várias statements num único request.

## O que mudou

| Antes | Depois |
| --- | --- |
| Ranking: ~1600 HTTP | 1 batch (catálogo + evals + importados + aula-teste) em paralelo com a lista |
| Dashboard: 1 count por campanha | `GROUP BY` |
| Perfil / comparar: loops por id | `inArray` + batch de scores |
| FKs sem índice | índices nas colunas usadas nas queries |

Bench contra o Neon (`npx tsx scripts/bench-ranking.ts`): **267 linhas, 267 com nota, ~0,8 s** com compute quente (primeira chamada ~2 s por cold start 0,25 CU). Antes: não completava.

## Arquivos

- `src/lib/scoring.ts` — `assembleDimensionScores` (lógica pura)
- `src/lib/queries/scoring-data.ts` — prefetch em batch
- `src/lib/queries/ranking.ts`, `dashboard.ts`, `candidate.ts`
- `src/app/(app)/comparar/page.tsx`, `src/app/(app)/ranking/loading.tsx`
- `src/lib/db/schema/index.ts` + `drizzle/0001_query_indexes.sql` (aplicada no Neon)
- `scripts/bench-ranking.ts`

## Validação

```bash
npx vitest run   # 10 testes
npx tsc --noEmit
npx tsx scripts/bench-ranking.ts
```

Smoke manual: login → Ranking deve pintar a tabela (não ficar em Rendering). Cobertura continua `3/8` nos importados (dimensão ausente não vira zero).

## Débitos

- Compute Neon 0,25 CU em `us-east-1`; cold start ainda custa 1–2 s
- Prev/next no perfil ainda recalcula o ranking filtrado (agora barato)
- Paginar o ranking **não** ajuda a ordenar por nota — precisa de todas as notas
- Não instalar `pg_stat_statements` (precisa de extensão no Neon)
