-- Valores novos do enum dimension_code.
--
-- Sozinhos num arquivo de propósito: o Postgres permite ALTER TYPE ADD VALUE
-- dentro de uma transação, mas NÃO permite usar o valor novo na mesma
-- transação — e o drizzle-kit envolve cada migration numa. O remapeamento
-- dos dados vive em 0006.
--
-- O que muda de nome e por quê:
--   didatica_humana      -> didatica_dissertativa
--     A dimensão nunca foi "humana": é a nota das 4 respostas dissertativas,
--     produzida por um ensemble de LLM. O nome antigo vinha de uma coluna mal
--     rotulada na planilha (QUESTION_CONFIG.humanCol) e ensinava a coisa errada.
--   prova_conteudo       -> conteudo_objetiva + conteudo_dissertativa
--     Uma dimensão só escondia duas provas distintas. Em 68 candidaturas de
--     2025 o valor guardado era a mistura (OBJ + 2*DISC)/3, irrecuperável a
--     partir do banco.

ALTER TYPE "dimension_code" ADD VALUE IF NOT EXISTS 'didatica_dissertativa';--> statement-breakpoint
ALTER TYPE "dimension_code" ADD VALUE IF NOT EXISTS 'conteudo_objetiva';--> statement-breakpoint
ALTER TYPE "dimension_code" ADD VALUE IF NOT EXISTS 'conteudo_dissertativa';
