# Análise dos dados

Arquivo: `dados-brutos/Anonimizado - BANCO TALENTOS DOCENTE EFAF-EM 2025.xlsx`

## Abas

| Aba | Linhas | Uso |
|-----|--------|-----|
| PROFESSORES | 271 (270 dados) | Candidaturas campanha 2025 |
| AULAS_TESTE | 18 avaliações reais | Rubrica aula-teste |
| App Metadata | 2 | Ignorar |

## Fórmulas validadas

| Campo | Fórmula |
|-------|---------|
| `Apr Dis (F)` | `10 × (Q1F+Q2F+Q3F+Q4F) / 120` |
| `Apr Obj` | `10 × soma(19 práticas) / 170` |
| `FINAL CONT` | `(OBJ CONT + 2×DISC CONT) / 3` |

Práticas (cols 54–72): Aferição Constante, Trabalhos em Grupo, Seminários, Devolutiva Individualizada, Trabalhos de Pesquisa, Participação Estimulada, Estímulo ao Erro, Filmes e Séries, Diagnóstico de Pré-requisitos, Lousa Interativa, Análise de resultados por habilidade, Exercícios frequentes, Cronômetro/tempo, Sermões, Focar nos interessados, Destacar erros publicamente, Corrigir comportamento imperceptível, Correção pública, Planejamento de aula.

## Disciplinas (9)

História (49), Biologia (42), Português Produção (41), Matemática (34), Geografia (30), Química (25), Filosofia/Sociologia (23), Física (15), Português Literatura (12).

## Critérios aula-teste (14)

Empatia, Presença, Linguagem, Preparação, Material, Aferição, Clareza, Paciência, Responsabilidade, Energia, Lousa, Resolução Exercício, Voz, Confiança.

## Armadilhas anonimização

- Nome/email/telefone constantes → chave dev = **Drive file ID** do currículo
- 3 currículos duplicados (mesmo link)
- Cols 74–87 PROFESSORES = AVERAGEIF global (ignorar)
- AULAS_TESTE não cruza com PROFESSORES após anonimizar nomes → `unmatched_lesson_tests`
- STATUS e IA vazios na planilha
- Scores LLM (L/G/A/O) em escala 0–30

## Gaps (escopo pede, arquivo não tem)

Entrevistas, CV/vídeo pontuados, CRM, status, tags, SCS 2026-08, textos das 4 perguntas, prompts LLM nomeados.

## Dimensões no consolidado

`prova_conteudo`, `didatica_objetiva`, `didatica_humana`, `curriculo`, `video`, `entrevista`, `aula_teste` (+ `socioemocional` futuro)
