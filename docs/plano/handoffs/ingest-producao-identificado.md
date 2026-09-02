# Ingestão de produção (workbooks identificados)

Gerado em 2026-09-02. Sem PII neste arquivo.

## O que foi feito

1. Confirmado o pipeline `npm run db:ingest` contra os workbooks em `tmp/` (gitignored).
2. Dry-run com `--allow-pii` — MAE e contagens de linhas conferiram.
3. `--replace-campaign` removeu os dados anonimizados/de teste das duas campanhas.
4. Carga dos IDENTIFICADO + `--cross-merge` ao final.

Comando:

```bash
npm run db:seed
npm run db:ingest -- --all --allow-pii --replace-campaign
```

Os arquivos em `tmp/` **não** entram no git. Logs e handoffs só têm contagens, MAE e chaves sintéticas (`PES-…` / `CAND-…`).

## Conferência no banco (pós-guard)

| Métrica | 2025-efaf-em | 2026-scs |
|---|---|---|
| candidates | 264 | 428 |
| applications | 270 | 437 |
| subjective_answers | 1.080 | 1.668 |
| llm_evaluations | 3.372 | 2.953 (máx. 2.965) |
| teaching_practice_scores | 5.130 | 7.923 |
| imported_dimension_scores | 729 | 910 (máx. 914) |
| documents | 540 | 854 |
| lesson_test_evaluations / scores | 18 / 219 | 0 / 0 |
| second_phase_confirmations | — | 406 |

- 0 candidatos com e-mail/nome sintético de anonimização
- `unmatched_lesson_tests` zerado
- MAE QnF: 1.1e-15 (2025) / 9.4e-16 (2026)
- MAE Apr Obj: 2.6e-7 (2025) / 2.5e-7 (2026)

## Intencionais, não falhas

- 1 candidatura 2026 de teste não entra (`CAND-2026-399`)
- 3 pessoas só na aba CANDIDATOS (sem candidatura)
- 7 provas 2026 com vínculo ambíguo: não atribuídas
- 18 provas `unico_por_pessoa`: atribuídas com flag `vinculo_prova_disciplina_diverge`
- 1 candidatura só-prova de Português: disciplina canônica inferida + flag `disciplina_canonica_inferida`
- 34 `candidate_merge_suggestions` por e-mail igual em campanhas distintas — decisão humana

## Ajustes no importador nesta carga

- Replace também limpa revisões de avaliação, merge suggestions e `unmatched_lesson_tests`
- Documentos em lotes de 200
- Vínculo de prova `ambiguo…` tratado como ambíguo
- Fallback de disciplina para rótulos de prova sem `disciplina_canonica`
- `import_row_errors` sem nome/conteúdo da planilha
