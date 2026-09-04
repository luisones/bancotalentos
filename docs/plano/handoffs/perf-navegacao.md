# Handoff — performance de navegação + CPU Neon

**Status:** Concluído

## Problema

Cada clique de sort/filtro no Painel e cada abertura de página:

1. Reexecutava o RSC inteiro (`force-dynamic` + `<a href>` no cabeçalho)
2. Chamava `getSession` + `staff_users` **3×** (layout + header + página)
3. Re-pontuava as **707** candidaturas no Neon (0,25 CU, us-east-1)
4. `llm_evaluations` sofria seq scan no join por `answer_id` (~14M tuplas lidas acumuladas)

## O que mudou

### Painel instantâneo (cliente)

- [`applyRankingFilters`](../../src/lib/ranking-sort.ts) + `painelHref` — lógica pura
- [`PainelBoard`](../../src/components/painel/painel-board.tsx) — island: sort/filtro/busca em memória; URL via `history.pushState`
- [`DataGrid`](../../src/components/liceu/data-grid.tsx) — `onSort` (botão), não mais `<a>`
- Filtros/busca viraram controles locais ([`painel-filters.tsx`](../../src/components/painel/painel-filters.tsx), [`search-field.tsx`](../../src/components/painel/search-field.tsx))

**Efeito:** reordenar colunas / pills / busca **não toca Neon nem Vercel**.

### Auth 1× por request

- `getSession` e `getStaffUser` com `React.cache` em [`staff.ts`](../../src/lib/auth/staff.ts)

### Menos HTTP no Neon

- `lesson_test_scores` entrou no `db.batch` de pontuação
- [`getCandidateDetail`](../../src/lib/queries/candidate-detail.ts) — 7 selects num batch (+ answer scores em paralelo)

### Data Cache cross-request

- Tags `application-list` e `scoring-data` via `unstable_cache` em [`cached-data.ts`](../../src/lib/queries/cached-data.ts)
- Consolidado cego continua montado em memória com `staffUserId`
- Invalidação:
  - CRM (status/estrela/recado) → `application-list`
  - Avaliação/pesos → `scoring-data`
  - Contato/nota longa → só `revalidatePath`
- Fallback fora do Next (scripts) quando `incrementalCache missing`

### Índices Neon

Migration [`drizzle/0010_perf_indexes.sql`](../../drizzle/0010_perf_indexes.sql) aplicada:

- `llm_evaluations(answer_id)` — EXPLAIN mostra **Index Scan**
- `subjective_answers(application_id) WHERE override_score IS NOT NULL`

## Validação

```bash
npx vitest run          # 25 testes
npx tsc --noEmit
npx tsx scripts/bench-ranking.ts
# 707 apps, 705 com nota, ~0,98 s (caminho direto fora do Data Cache do Next)
```

EXPLAIN do join LLM:

```
Index Scan using llm_evaluations_answer_id_idx on llm_evaluations
  Index Cond: (answer_id = sa.id)
```

## Débitos / follow-up

- Browser E2E com login Google não rodou nesta sessão (sem ferramentas de browser / sessão)
- `cacheComponents` / PPR do shell auth fica para depois
- Perfil ainda monta o banco pontuado (agora via cache hit na maioria dos casos); se TTFB ainda pesar, passar prev/next na query do Painel
- Compute continua 0,25 CU em us-east-1; latência de rede não muda com este diff

## Prompt da próxima

Smoke manual: login → Painel (sort, pills, busca devem ser imediatos) → abrir perfil → voltar → salvar nota → Painel atualiza.
