# Plano de implementação — Banco de Talentos Docentes

Fonte de verdade para agentes e desenvolvedores. **Não confie na memória do chat** — leia estes arquivos antes de cada etapa.

## Índice

| Arquivo | Conteúdo |
|---------|----------|
| [00-contexto-produto.md](./00-contexto-produto.md) | Visão, fora de escopo, regras críticas |
| [01-analise-dados.md](./01-analise-dados.md) | Inventário da planilha, fórmulas, gaps |
| [02-modelo-dados.md](./02-modelo-dados.md) | Tabelas, enums, índices |
| [03-design-system.md](./03-design-system.md) | Tokens visuais Liceu |
| [04-arquitetura.md](./04-arquitetura.md) | Neon, auth, pastas do código |
| [05-verificacao.md](./05-verificacao.md) | Critérios de sucesso + QA |
| [etapas/](./etapas/) | Checklist por etapa E00–E09 |
| [handoffs/](./handoffs/) | Relatórios de conclusão de cada etapa |
| [AGENTS-ETAPA.md](./AGENTS-ETAPA.md) | Prompt colável para novo chat |

## Contrato de toda etapa

1. Ler este README + arquivo da etapa em `etapas/` + último handoff em `handoffs/`
2. Executar **somente** aquela etapa
3. Rodar o checklist da etapa
4. Escrever `handoffs/E0X.md` com: mudanças, arquivos, comandos, débitos, validação, prompt da próxima
5. Divergências novas vão para `01-analise-dados.md`, não no escopo original

## Ordem das etapas

```
E00 docs → E01 Neon/Auth → E02 schema → E03 ingestão → E04 UI shell
→ E05 ranking/perfil → E06 avaliações → E07 CRM → E08 consolidado → E09 QA
```

## Escopo original

Ver [`Banco de Talentos Docentes — Escopo do MVP.md`](../../Banco%20de%20Talentos%20Docentes%20—%20Escopo%20do%20MVP.md) na raiz do repositório.
