/**
 * Limite da nota rápida.
 *
 * Vive fora de `actions/crm.ts` porque um arquivo "use server" só pode
 * exportar funções async — a constante ali quebrava o build em runtime.
 * Validado no cliente (contador) e no servidor (a action recusa acima disto).
 */
export const QUICK_NOTE_MAX = 120;
