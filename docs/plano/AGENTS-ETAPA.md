# Prompt colável para agente (nova etapa)

Substitua `E0X` pelo número da etapa atual.

```
Você está no repositório bancotalentos (Banco de Talentos Docentes — Liceu Jardim).

Antes de codar:
1. Leia docs/plano/README.md
2. Leia docs/plano/etapas/E0X-....md (etapa solicitada)
3. Leia o handoff mais recente em docs/plano/handoffs/

Execute SOMENTE essa etapa. Não avance para a próxima sem pedido explícito.

Ao terminar:
- Checklist da etapa 100% verde
- Escreva docs/plano/handoffs/E0X.md
- Não edite o arquivo de escopo na raiz nem o plano em .cursor/plans/

Stack: Next.js App Router, Drizzle, Neon Postgres, Managed Better Auth (Google Workspace da escola).
Auth: somente e-mails @liceujardim.com.br e @liceujardim.pro.br na allowlist staff_users.
```
