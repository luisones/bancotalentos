-- Aula-teste lançada pela interface: uma avaliação por avaliador.
--
-- O único índice único da tabela era em `external_ref`, que só existe no que
-- veio da planilha. Salvar o formulário de critérios duas vezes criava duas
-- avaliações e, como a nota da dimensão é a MÉDIA DAS MÉDIAS por avaliador, a
-- segunda nota diluía a primeira em vez de substituí-la.
--
-- O parcial `where external_ref is null` preserva o histórico importado, onde a
-- mesma pessoa legitimamente avaliou a mesma candidatura em vagas diferentes.
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_test_evaluations_manual_idx" ON "lesson_test_evaluations" USING btree ("application_id","evaluator_staff_id") WHERE "external_ref" is null;
