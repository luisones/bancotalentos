# Verificação de sucesso

MVP pronto quando gestor (Google Workspace + staff ativo) consegue os 20 itens do escopo §64.

## Checklist funcional (browser)

| # | Critério | Rota | Etapa |
|---|----------|------|-------|
| 1 | Entrar no sistema | `/auth/sign-in` | E01 |
| 2 | Localizar candidato | `/ranking` | E05 |
| 3 | Ver participações anteriores | `/candidatos/[id]` aba Histórico | E05 |
| 4 | Abrir currículo e vídeo | Perfil → documentos | E05 |
| 5 | Consultar respostas | Perfil → Respostas | E05/E06 |
| 6 | Avaliar currículo | Perfil → Currículo | E06 |
| 7 | Avaliar vídeo | Perfil → Vídeo | E06 |
| 8 | Avaliar entrevista | Perfil → Entrevista | E06 |
| 9 | Rubrica aula-teste | Perfil → Aula-teste | E06 |
| 10 | Médias entre avaliadores | Perfil dimensões | E06 |
| 11 | Resultado consolidado | Perfil resumo | E08 |
| 12 | Cobertura visível | Ranking + perfil | E08 |
| 13 | Registrar contato | Perfil → Contatos | E07 |
| 14 | WhatsApp | Perfil header | E05 |
| 15 | Alterar andamento | Perfil status | E07 |
| 16 | Classificar talento | Perfil classificação | E07 |
| 17 | Filtrar campanha | `/ranking?campaign=` | E05 |
| 18 | Ordenar por dimensão | Ranking sort | E05 |
| 19 | Comparar candidatos | `/comparar` | E08 |
| 20 | Cadastro manual | `/admin/candidatos/novo` | E07 |

## Testes automatizados

- `lib/scoring.test.ts`: renormalização pesos, cobertura, fórmulas planilha
- Authz: avaliador não edita alheia; consulta read-only

## Smoke pós-etapa (E04+)

Após cada etapa de UI, revalidar login + dashboard + ranking básico.

## Auth negativo

- Email Google fora da allowlist → bloqueado
- Domínio não escola → bloqueado
