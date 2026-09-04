# Handoff — Painel interativo, aula-teste por critérios, entrevista

**Status:** Concluído

## O achado que reorganizou o resto

`assembleDimensionScores` (`src/lib/scoring.ts:295`) faz a média dos critérios de
aula-teste **vencer** qualquer linha de `evaluations` para a dimensão
`aula_teste`. E o banco confirmava a consequência:

| consulta | resultado |
| --- | --- |
| `evaluations` com dimensão `aula_teste` | **0** linhas |
| `imported_dimension_scores` de `aula_teste` | **0** linhas |
| `lesson_test_evaluations` | 18 |

Ou seja: o campo de nota única 0–10 de aula-teste que existia no perfil aceitava
um número que o cálculo ignorava em silêncio, e as 18 aulas com critérios eram a
única fonte real da nota. Por isso a ficha de 14 critérios **substituiu** aquele
campo em vez de conviver com ele — conviver era manter a divergência.

Pinado em teste: `scoring.test.ts` → *"lesson-test average beats a live
evaluation on aula_teste"*. Se esse teste inverter, o formulário deixa de ser a
fonte da nota e a interface volta a mentir.

## Ressalva: aula-teste não respeita avaliação cega

`lessonTestScore` entra **antes** do filtro por avaliador em `scoring.ts:295`, e
`blind_peeks` não a alcança. Isso já valia para o dado importado; agora vale
também para nota lançada na interface — ao abrir a ficha, o avaliador vê a média
dos colegas antes de dar a própria nota.

Não foi alterado neste trabalho porque mudar a precedência mexe na nota
histórica de 18 candidaturas. Fica registrado como decisão pendente: ou a
aula-teste passa a respeitar a cegueira (e a nota histórica muda de
significado), ou se documenta que ela é deliberadamente aberta.

## Escrita da aula-teste

`saveLessonTest` (`src/lib/actions/evaluations.ts`) grava
`lesson_test_evaluations` + `lesson_test_scores` e **não** grava em
`evaluations`: a nota da dimensão é derivada, e derivá-la de duas fontes é o que
criava a divergência acima.

- Critério em branco é **omitido**, nunca zero. A média é sobre o observado — no
  histórico há aulas com 6 de 14 critérios preenchidos.
- Reescrita completa dos critérios (`DELETE` + `INSERT`), não upsert: um
  critério que o avaliador apagou tem de sair da média.
- Migração `0011_aula_teste_manual.sql`: índice único parcial em
  `(application_id, evaluator_staff_id) WHERE external_ref IS NULL`. O único
  índice único da tabela era em `external_ref`, que só existe no dado da
  planilha; sem a trava, salvar duas vezes criava duas avaliações e — como a
  nota é a **média das médias por avaliador** — a segunda diluía a primeira.
  O parcial preserva o histórico importado, onde a mesma pessoa legitimamente
  avaliou a mesma candidatura em vagas diferentes.

> As migrações 0005–0011 são escritas à mão e registradas no `_journal.json`
> sem snapshot; os snapshots do drizzle-kit param em `0004`. Rodar
> `db:generate` produz uma migração que recria meia base — **não use**.

## Custo de payload no Painel

O Painel entrega 707 linhas de uma vez. As células interativas precisam de dados
que não cabem nesse pacote, e a divisão ficou assim:

| dado | onde vive |
| --- | --- |
| nota, status, distância, nível de inglês | na linha (já estava) |
| coordenada do CEP, `hasCurriculo`, `hasVideo` | na linha (4 campos novos, baratos) |
| URL de currículo / vídeo | **não vai na linha** — `/api/documento/[id]/[tipo]` redireciona |
| 14 critérios, 4 dissertativas, nota própria de vídeo | **sob demanda** — `/api/painel/[id]`, cacheado por candidatura no island |

707 × 2 URLs seriam ~110KB de RSC para links quase nunca clicados; os critérios
e as dissertativas seriam da ordem de um megabyte.

`fetchApplicationBase` teve a chave de cache bumpada para `application-base-v2`.

A ficha de aula-teste **saiu** de `getCandidateDetail`, onde custava dois
acessos (os critérios dependem dos ids das avaliações e não caíam no `batch`) em
toda visita ao perfil, para popular um `<details>` fechado.

## Estado otimista vs. nota agregada

Duas naturezas diferentes, tratadas de formas diferentes em `painel-board.tsx`:

- **Status e nota rápida**: o valor gravado é exatamente o que se escolheu →
  overlay local, aparece na hora, e a ordenação por Status acompanha.
- **Nota de aula-teste e de vídeo**: agregam entre avaliadores no servidor →
  `router.refresh()`. Chutar o número mostraria a nota de uma pessoa onde
  deveria estar a média.

O overlay é descartado quando chega payload novo do servidor (comparação de
identidade de `rawRows` durante o render).

## Correções de interface que valem registro

- **Cabeçalho desalinhado do dado** (`data-grid.tsx`): o cabeçalho ordenável era
  `inline-flex`, e uma caixa inline-flex numa célula de grid encolhe ao conteúdo
  e ancora no início — `justify-end` alinhava dentro da caixa, não na coluna.
  Toda coluna numérica estava desencontrada. Agora `flex w-full`.
- **`pushState` durante o render** (`painel-board.tsx`): o sync da URL rodava
  dentro do updater do `setState`, e o Router do Next reage a ele atualizando o
  próprio estado — *"Cannot update a component (Router) while rendering a
  different component"* a cada clique de filtro. Foi para um efeito.
- **Card do celular** (`data-grid.tsx` → `stacked`): o empilhamento automático
  punha as doze células numa coluna, cada uma "RÓTULO valor" com metade da
  largura vazia. `DataGridRow` aceita uma composição própria para tela estreita.

## Mini-mapa sem biblioteca

`distance-map.tsx` é um esquema em SVG inline: três pontos, as linhas e o km.
Zero requisição, zero dependência. Projeção equirretangular com correção de
`cos(lat)` — sem ela, a −23,6° a figura fica ~9% esticada na horizontal e a
proporção entre "longe pro lado" e "longe pra cima" mente. Escala única nos dois
eixos; o excedente vira margem. Quem precisa de ruas tem o link para o Google
Maps, que é onde ruas importam.

`UNITS` saiu de `geo/cep.ts` para `geo/units.ts` para o mapa não arrastar os
clientes de BrasilAPI, Nominatim e OSRM para o bundle.

## Português agrupado

`lib/discipline-group.ts`, derivado do slug, sem migração. As duas variantes
(63 + 28 = 91 candidaturas) viram uma pílula de filtro e **uma** contagem de
posição — antes "1º de 28" era uma colocação mais lisonjeira do que "1º de 91"
sem nada no mundo real justificar. O perfil e a linha do Painel continuam
mostrando a disciplina completa.

Link antigo com `discipline=portugues-literatura` passa a trazer o grupo.

## Prosa que virou forma

Os cartões do Resultado diziam a ausência em frases — "Ninguém lançou nota de
aula-teste.", "Só conteúdo objetiva.", "Não fez prova de conteúdo." Agora:
trilho tracejado vazio (a mesma gramática do `MeterBar`: sem avaliação é
visualmente diferente de nota zero) e o rótulo da parte ausente em vermelho.
`ScoreCard.emptyHint` foi removido do tipo.

Também saíram: a fileira de pastilhas `AT · DO · DD · CD · CO · VD` do cartão de
identidade, o bloco "Práticas declaradas" (a nota da didática objetiva continua
visível; a lista permanece no documento de impressão), e a frase sobre os pesos.
Nos cartões e no Painel, as partes são `Obj.` / `Dis.` — `lib/dimension-short.ts`.
O `short_code` do banco fica intacto: é a chave que casa a planilha com a
dimensão.

## Achados da revisão, e o que foi feito

| achado | decisão |
| --- | --- |
| O cache de `PainelDetail` não era invalidado após substituir a nota de uma dissertativa — reabrir o popover mostrava a porcentagem antiga ao lado de uma coluna já recalculada | `AnswerScores` ganhou `onSaved`; `DidaticaCell` e o cartão do perfil invalidam e recarregam |
| Rascunho velho de aula-teste sobrescrevia critérios já salvos, e o save é reescrita completa — 6 critérios do notebook apagariam os 14 do celular | com avaliação salva, o rascunho é **oferecido** e não aplicado; o auto-save fica suspenso enquanto a oferta está pendente |
| `DELETE` + `INSERT` de critérios em dois round-trips: um INSERT que falhasse deixava a avaliação apagada e a interface dizia "não foi enviada" | os três statements num `db.batch` (o Neon executa batch em transação); ids de critério validados contra o catálogo antes de qualquer escrita |
| As rotas novas não validavam o formato do id — `/api/painel/nao-e-uuid` virava 500 | `isUuid` nas duas, 400 |
| Overlay otimista descartado por qualquer payload novo, sem saber qual é mais recente: trocar um status durante um `router.refresh()` faz o badge piscar de volta | **mantido**, e documentado no código. A alternativa (manter até o servidor concordar) mostraria a nossa escrita mesmo depois de um colega mudar aquele status — este projeto prefere piscar a exibir valor superado |

Sem achado em nesting de interativo dentro de link, e sem furo de permissão nas
rotas novas (as duas exigem sessão de equipe; `canWrite` sai do servidor e toda
escrita revalida por `requireStaff`).

## Removidos por não ter consumidor

`components/candidate/instrument-badges.tsx`,
`components/ranking/ranking-filters.tsx` (já não era importado por ninguém).
