# OBS 2026 → notas rápidas

Gerado em 2026-09-04. Sem PII neste arquivo.

## O que foi feito

A coluna `OBS` das 14 abas de disciplina da planilha de resultados 2026 passa a alimentar `candidates.highlighted_note` (a nota rápida do Painel).

Fonte: `FLAGS_TAGS` dos workbooks normalizados — já é o OBS casado com `pessoa_id`. A planilha original não entra no script: ela só existe identificada, e a versão anonimizada do workbook já redige o caso que cita terceiro.

Não é a coluna `Observações:` da aba oculta `VIDEOS` (texto do candidato → `candidate_observation`).

## Privacidade

- IDENTIFICADO exige `--allow-pii`, o mesmo gate da ingestão.
- stdout, handoff e `audit_events` do lote não carregam o corpo da nota — só contagens e `PES-…`.
- Nota rápida já escrita pela equipe não é sobrescrita (salvo `--force`).
- O texto vive só em `highlighted_note`, visível a staff autenticado.

## Números (após a carga)

| | Valor |
|---|---|
| OBS nas abas de disciplina | 31 |
| Pessoas distintas | 31 |
| Gravadas agora | 30 |
| Preservadas (equipe já tinha escrito) | 1 |
| Sem candidato | 0 |
| Comprimento máximo da planilha | 38 (limite da nota rápida: 120) |
| Candidatos 2026 com nota rápida | 32 (30 novas + 2 que já existiam) |
| Observações longas ligadas à pessoa | 2 |

## Comando

```bash
npx tsx scripts/backfill/obs-quick-notes-2026.ts --dry-run --allow-pii
npx tsx scripts/backfill/obs-quick-notes-2026.ts --allow-pii
```

Reingestões futuras (`npm run db:ingest -- 2026-scs --allow-pii`) aplicam o mesmo mapeamento e também não sobrescrevem nota da equipe.

## Cache

A chave do Data Cache da lista subiu de `application-base-v4` para `v5`, para o Painel não servir a lista velha por até 1 h. O perfil já lia o banco na hora.
