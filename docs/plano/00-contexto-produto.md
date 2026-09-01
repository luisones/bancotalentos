# Contexto do produto

## Visão

Plataforma interna para organizar, acompanhar, avaliar e comparar candidatos a posições docentes do Liceu Jardim. Histórico longitudinal de talentos ao longo de campanhas.

## Decisões fechadas

- **Auth:** Google Workspace (`@liceujardim.com.br`, `@liceujardim.pro.br`). Admin pré-cadastra staff. Sem self-signup.
- **Primeiro admin:** `luis.ribeiro@liceujardim.pro.br`
- **Stack:** Next.js App Router + Drizzle + Neon Postgres + Managed Better Auth
- **Didática objetiva:** 19 práticas ponderam `Apr Obj`; sem UI de práticas no MVP
- **Campanha inicial:** EFAF-EM 2025 (planilha anonimizada)

## Regras críticas de negócio (escopo §62)

1. Um candidato pode ter várias candidaturas
2. Candidatura pertence a uma campanha
3. Histórico nunca sobrescrito por campanhas futuras
4. Currículo e vídeo pertencem à candidatura
5. Múltiplos avaliadores por dimensão
6. Média nunca substitui registros individuais
7. Avaliador não edita avaliação de outro
8. Avaliação cega por padrão (peek auditado)
9. Dimensão ausente não conta como zero
10. Consolidado sempre com cobertura
11. Pesos globais (não por campanha)
12. Histórico de pesos rastreável
13. Comparação cross-campanha
14. LLM: registros ilimitados por modelo
15. Perguntas/respostas preservam contexto histórico
16. Status operacional ≠ status seletivo
17. Resultado numérico ≠ classificação qualitativa
18. Candidato pode permanecer no banco sem seleção
19. Cadastro manual sem campanha permitido
20. Sem importador universal no MVP

## Perfis

| Perfil | Pode |
|--------|------|
| **admin** | Tudo + pesos + correções + usuários |
| **avaliador** | Ver, avaliar (próprias), observações, contatos |
| **consulta** | Somente leitura |

## Fora do MVP

Portal público, vagas publicadas, inscrição online, upload de CV, WhatsApp/e-mail automático, motor LLM in-app, socioemocional completo, importador universal, UI de práticas pedagógicas.

## Terminologia

- **Pontuação:** valor individual de uma avaliação
- **Resultado:** consolidado de uma etapa/dimensão
- **Resultado consolidado:** agregação ponderada com cobertura
