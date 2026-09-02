# Análise dos dados

Fonte de ingestão: workbooks normalizados em `tmp/*_ANONIMIZADO.xlsx` (desenvolvimento) e `tmp/*_IDENTIFICADO.xlsx` (produção local, nunca versionar).

## Campanhas

| Campanha | Candidatos | Candidaturas | LLM evals | Scores dimensão | Aulas-teste |
|----------|------------|--------------|-----------|-----------------|-------------|
| 2025-efaf-em | 264 | 270 | 3.375 | 729 | 18 × 14 critérios |
| 2026-scs | 428 | 437* | ≤ 2.965 | ≤ 914 | — |

\*437 após excluir `CAND-2026-399` (envio de teste).

## Chaves de ingestão

- **`pessoa_id`** (`PES-2025-###` / `PES-2026-###`) — chave natural de candidato (`candidates.external_ref`)
- **`candidatura_id`** (`CAND-…`) — chave de candidatura (`applications.external_ref`)
- **`matricula`** — inscrição da prova 2026 (`applications.exam_registration`)
- Drive CV ID permanece em `documents`, **não** como chave de pessoa

## Fórmulas validadas

| Campo | Fórmula |
|-------|---------|
| `QnF` | `Σ(w_p × score_p) / Σ(w_p presentes)` com L=0,5 · G=0,15 · A=0,175 · O=0,175 |
| `Apr Dis (F)` / `didatica_humana` | `10 × (Q1F+Q2F+Q3F+Q4F) / 120` |
| `Apr Obj` / `didatica_objetiva` | `10 × Σ(19 práticas valor) / 170` |
| `FINAL CONT` / `prova_conteudo` | `(OBJ CONT + 2×DISC CONT) / 3` [2025] |

Prática 4 (*Devolutiva Individualizada*): peso **1,5 FWD** (corrigido; planilha original gravava 0).

## Disciplinas

**2025 (9):** História, Biologia, Português Produção, Matemática, Geografia, Química, Filosofia/Sociologia, Física, Português Literatura.

**2026 (+6):** Polivalente Anos Iniciais, Polivalente Ed. Infantil, Educação Física, Inglês, Arte, Espanhol. Granularidade do formulário mapeada via `disciplina_canonica`.

## Cobertura 2026 — armadilhas críticas

- **171/418 candidaturas sem avaliação LLM** — zeros da planilha origem **não** importados; `avaliado_llm` marca quem foi avaliado
- **21 faltas de prova** — `nota_valida` vazia; flag `falta_prova`
- **7 provas com vínculo ambíguo** — não atribuídas automaticamente
- Dimensão ausente = sem linha em `SCORES_DIMENSAO` (nunca 0)

## Abas dos workbooks

`CANDIDATOS`, `CANDIDATURAS`, `DOCUMENTOS`, `RESPOSTAS`, `PRATICAS`, `AULAS_TESTE`, `SCORES_DIMENSAO`, `PROVAS` (2026), `SEGUNDA_FASE` (2026), `FLAGS_TAGS` (2026), `REJEITADOS`, `LEGENDA`

## Dimensões no consolidado

`prova_conteudo`, `didatica_objetiva`, `didatica_humana`, `curriculo`, `video`, `entrevista`, `aula_teste` (+ `socioemocional` futuro)
