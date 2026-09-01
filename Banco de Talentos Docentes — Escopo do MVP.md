# Banco de Talentos Docentes — Escopo do MVP

## 1. Visão geral

O **Banco de Talentos Docentes** será uma plataforma interna para organizar, acompanhar, avaliar e comparar candidatos a posições docentes da escola.

O sistema deverá funcionar não apenas como um cadastro de candidatos, mas como um **histórico longitudinal de talentos**, permitindo acompanhar a mesma pessoa ao longo de diferentes campanhas, candidaturas e processos seletivos.

O objetivo do MVP é consolidar os dados já existentes, atualmente distribuídos em formulários, planilhas, links de Drive e registros de avaliações, criando uma única interface interna para consulta, avaliação e acompanhamento operacional.

Neste momento, o sistema **não será responsável por publicar vagas nem receber inscrições diretamente dos candidatos**.

Essas funcionalidades devem ser consideradas como evolução futura.

---

# 2. Objetivos principais do MVP

O MVP deve permitir:

1. Manter um cadastro permanente de candidatos.
2. Registrar múltiplas candidaturas de uma mesma pessoa ao longo do tempo.
3. Organizar candidaturas por campanhas.
4. Registrar áreas, disciplinas, segmentos e interesses profissionais.
5. Centralizar resultados das diferentes etapas do processo seletivo.
6. Permitir avaliações independentes feitas por diferentes gestores.
7. Consolidar resultados de múltiplos avaliadores.
8. Registrar avaliações humanas e avaliações produzidas por LLMs.
9. Permitir acesso rápido aos documentos externos associados ao candidato.
10. Registrar contatos e andamento operacional do processo.
11. Criar rankings e filtros de candidatos.
12. Comparar candidatos.
13. Identificar candidatos interessantes para oportunidades futuras.
14. Manter histórico completo das participações de uma pessoa ao longo dos anos.
15. Permitir inserção manual de candidatos.
16. Importar inicialmente os dados das campanhas existentes por meio de scripts específicos.

---

# 3. Princípios de arquitetura

O sistema deve seguir alguns princípios importantes.

## 3.1. Separação entre pessoa, candidatura e campanha

A entidade principal permanente será o **Candidato**.

Uma pessoa pode participar de várias candidaturas ao longo do tempo.

Cada candidatura pertence a uma campanha.

Estrutura conceitual:

```text
Candidato
   ├── Candidatura A
   │      └── Campanha 2025.2
   │
   ├── Candidatura B
   │      └── Campanha SCS 2026-08
   │
   └── Candidatura C
          └── Campanha futura
```

Os dados históricos de uma candidatura nunca devem ser sobrescritos por uma candidatura futura.

---

## 3.2. Evitar colunas específicas para cada etapa

O banco não deve ser estruturado com dezenas de campos fixos como:

```text
nota_video
nota_curriculo
nota_entrevista
nota_aula
nota_didatica
```

Sempre que possível, utilizar estruturas reutilizáveis de:

* dimensão;
* instrumento;
* avaliação;
* avaliador;
* resultado;
* evidência;
* comentário.

Isso permite que novas etapas sejam adicionadas futuramente sem reconstruir a tabela principal de candidatos.

---

## 3.3. Histórico e rastreabilidade

Alterações importantes devem ser rastreáveis.

Especialmente:

* avaliações;
* alterações em pontuações;
* status;
* classificação do candidato;
* contatos;
* configurações de pesos;
* prompts utilizados por LLMs.

Não é necessário criar uma interface complexa de auditoria no MVP, mas o banco deve permitir reconstruir essas alterações.

---

# 4. Entidades principais

## 4.1. Candidato

Representa a pessoa de forma permanente.

Campos sugeridos:

```text
id
nome
email
telefone
cidade
observacoes_gerais
origem
created_at
updated_at
```

Outros dados pessoais existentes nas planilhas podem ser adicionados após análise dos arquivos reais.

### Origem

Campo opcional para identificar como a pessoa entrou no Banco de Talentos.

Exemplos:

* processo seletivo;
* indicação;
* candidatura espontânea;
* prospecção;
* ex-colaborador;
* outro.

---

# 5. Candidatura

Representa uma participação ou manifestação profissional do candidato em determinado contexto.

Campos conceituais:

```text
id
candidate_id
campaign_id
status_operacional
status_seletivo
data_candidatura
observacoes
created_at
updated_at
```

Uma candidatura poderá possuir:

* disciplinas de interesse;
* segmentos;
* áreas profissionais;
* vagas relacionadas;
* documentos;
* respostas subjetivas;
* avaliações;
* provas;
* entrevistas;
* aula-teste;
* histórico de contatos.

---

# 6. Campanha

Representa um processo seletivo ou grupo de candidaturas realizadas em determinado período.

Exemplos iniciais:

```text
2025 — 2º semestre
SCS 2026-08
```

Campos sugeridos:

```text
id
nome
descricao
data_inicio
data_fim
status
created_at
```

Campanhas devem permanecer arquivadas para comparação histórica.

---

# 7. Vagas

O sistema deverá estar preparado para trabalhar com vagas, mesmo que elas não sejam o elemento central do MVP.

Uma vaga poderá estar associada a:

* unidade;
* segmento;
* disciplina;
* função;
* campanha.

Exemplo:

```text
Professor de Química
Ensino Médio
São Caetano do Sul
Campanha SCS 2026-08
```

Uma candidatura poderá estar associada a uma ou mais vagas.

Entretanto, o candidato não deve ficar permanentemente preso à vaga para a qual originalmente se candidatou.

---

# 8. Áreas de atuação

O sistema deve distinguir duas informações diferentes:

## 8.1. Interesse declarado pelo candidato

Exemplo:

```text
Matemática — Ensino Médio
```

## 8.2. Potencial identificado pela escola

Exemplo:

```text
Matemática — Fundamental II
Física — Ensino Médio
```

Isso permite que um professor seja encontrado futuramente para uma vaga diferente daquela para a qual originalmente se candidatou.

---

# 9. Documentos da candidatura

Documentos devem pertencer à candidatura, e não permanentemente ao candidato.

Isso é especialmente importante para o currículo, pois ele pode mudar ao longo dos anos.

Tipos iniciais:

* currículo;
* vídeo de apresentação;
* gravação de entrevista;
* outros documentos futuros.

Campos conceituais:

```text
id
application_id
tipo
url
descricao
data_documento
created_at
```

No MVP, os documentos continuarão armazenados externamente, principalmente no Google Drive.

O sistema apenas armazenará e abrirá os links.

A proteção dos arquivos será feita pelas permissões existentes no Drive.

---

# 10. Currículo

No MVP:

* armazenar link;
* permitir abertura rápida;
* permitir pontuação;
* permitir observação;
* permitir múltiplos avaliadores.

Interface sugerida:

```text
Currículo

[Abrir currículo]

Resultado médio: 8,2
3 avaliações

Minha avaliação:
Pontuação: [ 0–10 ]
Observações:
[                     ]
```

Futuramente o sistema poderá:

* exibir currículo embutido;
* extrair automaticamente dados estruturados;
* preencher formação;
* experiências;
* disciplinas;
* segmentos;
* escolas anteriores;
* tempo de experiência;
* idiomas;
* outras informações.

A extração futura deve ser factual, não necessariamente uma avaliação qualitativa automática.

---

# 11. Vídeo de apresentação

Cada candidatura pode ter um vídeo de apresentação.

No MVP:

* link externo;
* pontuação geral de 0 a 10;
* comentário geral;
* múltiplos avaliadores.

Não haverá rubrica detalhada para o vídeo inicialmente.

---

# 12. Modelo geral de avaliação

Cada avaliação deve ser um registro independente.

Exemplo conceitual:

```text
evaluation
----------
id
application_id
dimension_id
evaluator_id
score
comment
created_at
updated_at
```

Nunca armazenar apenas a média.

A média deve ser calculada a partir das avaliações individuais.

Exemplo:

```text
Vídeo

Avaliador A: 8,0
Avaliador B: 7,0
Avaliador C: 9,0

Resultado da dimensão: 8,0
Avaliações: 3
```

---

# 13. Regras das avaliações humanas

## 13.1. Autoria

Toda avaliação deve registrar:

* avaliador;
* data;
* pontuação;
* comentário;
* dimensão avaliada.

## 13.2. Edição

Um avaliador pode alterar a própria avaliação.

Ele não pode editar a avaliação de outra pessoa.

Administradores podem corrigir dados quando necessário, mas alterações devem ficar registradas.

## 13.3. Histórico

O banco deve guardar histórico de alterações relevantes.

Exemplo:

```text
8,0 → 7,5
alterado por João
01/09/2026 14:32
```

---

# 14. Avaliação cega

Para reduzir influência entre avaliadores:

Quando um usuário ainda não avaliou determinada dimensão, as avaliações existentes de outros avaliadores deverão permanecer ocultas.

Exemplo:

```text
Vídeo

2 avaliações já realizadas

[ Avaliar candidato ]

👁 Ver avaliações existentes
```

Se o usuário clicar no ícone de visualização, poderá consultar os resultados antes de avaliar.

Essa ação deve ser permitida, mas idealmente registrada.

Depois que o avaliador enviar sua própria avaliação, os resultados dos demais ficam normalmente disponíveis.

---

# 15. Escala das pontuações

A interface principal deverá trabalhar preferencialmente com uma escala:

```text
0 a 10
```

Pontuações decimais devem ser permitidas.

Exemplo:

```text
7,5
8,2
9,0
```

---

# 16. Prova objetiva de conteúdo

Cada candidato poderá possuir resultado de uma prova objetiva associada à sua candidatura.

Exemplos:

* prova de Química;
* prova de Matemática;
* prova de Português.

No MVP, é suficiente armazenar:

```text
instrumento / versão da prova
disciplina
resultado normalizado 0–10
```

Exemplo:

```text
Química — Prova 2026-A
Resultado: 8,4
```

A nota poderá ser corrigida manualmente por administradores quando necessário.

A versão da prova deve ser preservada para rastreabilidade.

---

# 17. Respostas subjetivas / avaliação de didática

Alguns processos seletivos possuem perguntas subjetivas respondidas pelo candidato.

Atualmente existem casos com quatro perguntas.

Cada pergunta deve preservar:

* texto da pergunta;
* resposta do candidato;
* pontuação máxima original;
* candidatura;
* campanha;
* avaliações humanas;
* avaliações realizadas por LLM.

A pergunta deve ser preservada historicamente.

Se o texto da pergunta mudar futuramente, isso não deve alterar o conteúdo apresentado aos candidatos de campanhas antigas.

---

# 18. Avaliações por LLM

Uma mesma resposta poderá receber avaliações de múltiplas LLMs.

Não criar campos fixos como:

```text
llm_1
llm_2
llm_3
llm_4
llm_5
```

Criar registros independentes.

Exemplo:

```text
LLM Evaluation
--------------
id
answer_id
provider
model
score
prompt
created_at
```

Uma resposta poderá ter:

```text
GPT — 8,2
Claude — 8,5
Gemini — 7,9
Modelo X — 8,1
```

O número de avaliações por LLM deve ser ilimitado.

---

# 19. Prompts

O sistema deve estar preparado para armazenar prompts usados nas avaliações automáticas.

No futuro, deverá ser possível:

* editar o prompt atual;
* executar avaliações;
* guardar qual prompt foi efetivamente usado.

Não é necessário apresentar ao usuário um sistema formal chamado “versionamento de prompts”.

Entretanto, cada execução deverá preservar uma cópia do prompt utilizado.

Isso evita que alterações futuras destruam a rastreabilidade de avaliações antigas.

---

# 20. Resultado consolidado das respostas subjetivas

O sistema deverá calcular um resultado agregado da etapa.

Cada pergunta poderá receber:

* resultado humano;
* um ou mais resultados de LLM.

A ponderação entre humano e LLM será definida posteriormente.

O sistema deve ser projetado para permitir pesos configuráveis.

A avaliação humana poderá ter peso superior às avaliações automáticas.

---

# 21. Entrevista de alinhamento de valores

A entrevista deve ser propositalmente simples.

Pode haver vários entrevistadores simultâneos.

Cada entrevistador utilizará sua própria conta e realizará sua própria avaliação.

Interface sugerida:

```text
Entrevista de alinhamento

Perguntas sugeridas:
• ...
• ...
• ...
• ...

Resultado: [ 0–10 ]

Observações:
[                                  ]

[Salvar avaliação]
```

Não é necessário preencher respostas pergunta por pergunta.

As perguntas funcionam apenas como roteiro de apoio.

Se houver gravação da entrevista:

```text
[Abrir gravação]
```

---

# 22. Agendamento de entrevista e aula-teste

Entrevistas e aulas-teste poderão possuir dados operacionais de agendamento.

Campos:

```text
data
horário
unidade/local
responsável
status
observações
```

Status possíveis:

```text
a agendar
agendado
realizado
faltou
reagendar
cancelado
```

---

# 23. Aula-teste

A aula-teste será uma das avaliações estruturadas mais importantes.

Existirão aproximadamente 10 critérios previamente definidos.

Exemplos:

* didática;
* domínio do conteúdo;
* uso de materiais;
* verificação da aprendizagem;
* postura;
* voz;
* comunicação;
* empatia;
* organização;
* outros critérios definidos pela escola.

Os critérios serão cadastrados previamente pelo sistema.

Não é necessário criar uma interface administrativa para alterar os critérios no MVP.

---

# 24. Avaliação da aula-teste

Cada avaliador atribuirá uma pontuação de 0 a 10 para cada critério.

Exemplo:

| Critério    | Resultado |
| ----------- | --------: |
| Didática    |         8 |
| Materiais   |         7 |
| Verificação |         9 |
| Postura     |         8 |
| Voz         |         9 |
| Empatia     |         8 |

Além disso:

```text
Observações gerais:
[                                     ]
```

Não haverá inicialmente comentários individuais por critério.

Todos os critérios terão peso igual no MVP.

---

# 25. Consolidação da aula-teste

Para cada avaliador:

```text
Resultado individual =
média dos critérios avaliados
```

Depois:

```text
Resultado da aula-teste =
média dos resultados dos avaliadores
```

O dashboard deverá mostrar:

* resultado geral;
* quantidade de avaliadores;
* média por critério;
* avaliações individuais.

Exemplo:

```text
Aula-teste

Resultado: 8,4
3 avaliadores

Didática             8,8
Materiais            7,9
Verificação          8,2
Postura              8,7
Voz                  8,6
Empatia              8,3
```

---

# 26. Avaliação socioemocional

Não existe ainda resultado disponível para os candidatos atuais.

Entretanto, o banco deverá estar preparado para essa futura dimensão.

A avaliação deverá permitir múltiplos índices.

Exemplos:

```text
Grit
Mindset
Otimismo
outros indicadores
Índice geral
```

Essa funcionalidade não precisa ser implementada integralmente no MVP.

---

# 27. Dimensões do resultado consolidado

O sistema deverá permitir consolidar diferentes dimensões de avaliação.

Exemplos iniciais:

```text
Prova objetiva
Respostas subjetivas / didática
Currículo
Vídeo
Entrevista
Aula-teste
Socioemocional
```

---

# 28. Pesos globais

Os pesos das dimensões serão definidos globalmente no sistema.

Não serão específicos por campanha.

Motivo:

É importante permitir comparação entre candidatos de campanhas diferentes.

Exemplo conceitual:

| Dimensão             | Peso |
| -------------------- | ---: |
| Prova objetiva       |  20% |
| Respostas subjetivas |  15% |
| Currículo            |  10% |
| Vídeo                |  10% |
| Entrevista           |  20% |
| Aula-teste           |  25% |

Os valores reais serão definidos posteriormente.

Deve existir uma área administrativa simples para configurar esses pesos.

---

# 29. Histórico dos pesos

Embora a configuração seja global, mudanças futuras não devem destruir a rastreabilidade de resultados históricos.

O sistema deverá guardar internamente a configuração utilizada no cálculo.

Exemplo:

```text
Configuração A
válida a partir de 2026-09-01
```

Se os pesos mudarem futuramente, deverá ser possível identificar qual configuração produziu determinado resultado.

Isso pode ser invisível para usuários comuns.

---

# 30. Tratamento de dimensões ausentes

Uma dimensão não avaliada **não conta como zero**.

Exemplo:

Candidato:

```text
Prova: 9
Currículo: 8
Vídeo: não avaliado
Entrevista: não realizada
```

O resultado consolidado será calculado apenas com as dimensões disponíveis.

Os pesos disponíveis deverão ser renormalizados.

---

# 31. Cobertura da avaliação

Como candidatos com poucas etapas podem aparecer artificialmente muito bem posicionados, o resultado nunca deve ser apresentado sozinho.

Exemplo:

```text
Resultado consolidado: 9,1
Cobertura: 2/6 dimensões
```

ou:

```text
9,1
33% avaliado
```

A tabela de ranking deverá possuir uma coluna específica de cobertura.

---

# 32. Terminologia

Evitar utilizar a palavra “nota” para tudo.

Terminologia sugerida:

### Pontuação

Valor atribuído em uma avaliação individual.

Exemplo:

```text
Pontuação do vídeo: 8,5
```

### Resultado

Valor consolidado de uma etapa.

Exemplo:

```text
Resultado da aula-teste: 8,2
```

### Índice

Resultado calculado de instrumentos específicos.

Exemplo:

```text
Índice de Grit: 7,8
```

### Resultado consolidado

Agregação das dimensões disponíveis.

Exemplo:

```text
Resultado consolidado: 8,4
```

---

# 33. Classificação qualitativa do talento

O resultado numérico não será suficiente para representar o interesse da escola pelo candidato.

Criar uma classificação qualitativa independente.

Sugestão:

```text
Não classificado
Acompanhar
Interessante
Prioritário
Forte candidato
```

A nomenclatura final pode ser ajustada posteriormente.

---

# 34. Flags especiais

Criar flags independentes para situações importantes.

Exemplos:

```text
Manter para futuras oportunidades
Não contatar futuramente
Favorito
Revisar posteriormente
```

Esses flags não devem alterar automaticamente o resultado consolidado.

---

# 35. Tags

Permitir tags para facilitar a busca.

Exemplos:

```text
forte conteúdo
boa didática
perfil vestibular
boa comunicação
Fundamental II
Ensino Médio
liderança
polivalente
```

Idealmente combinar:

* tags padronizadas;
* possibilidade futura de tags livres.

---

# 36. Status operacional

Separar o andamento operacional da decisão seletiva.

Status operacionais possíveis:

```text
Novo
Aguardando contato
Contato realizado
Aguardando retorno
Entrevista a agendar
Entrevista agendada
Aula-teste a agendar
Aula-teste agendada
Avaliação pendente
Processo concluído
```

---

# 37. Status seletivo

Separadamente:

```text
Em avaliação
Avançar
Em dúvida
Não avançar
Selecionado
Não selecionado
Manter no Banco de Talentos
```

Os nomes poderão ser ajustados posteriormente.

---

# 38. Mini-CRM

O sistema deverá possuir um histórico simples de contatos.

Cada registro deverá armazenar:

```text
candidate_id / application_id
data
usuário responsável
canal
resultado
observação
created_at
```

Canais:

```text
telefone
WhatsApp
e-mail
outro
```

Resultados possíveis:

```text
não respondeu
contato realizado
retornar depois
agendado
sem interesse
indisponível
outro
```

---

# 39. Botão WhatsApp

Ao lado do telefone deverá existir:

```text
[WhatsApp]
```

O sistema deverá:

1. normalizar o telefone;
2. incluir código do país quando necessário;
3. remover espaços, parênteses e caracteres inválidos;
4. abrir a conversa correspondente no WhatsApp.

O sistema não precisa enviar mensagens automaticamente.

O objetivo é somente facilitar o contato.

---

# 40. Observações internas

Todos os usuários autorizados poderão visualizar observações internas.

Sugestão de duas estruturas:

## 40.1. Observação destacada

Informação importante que permanece visível no topo.

Exemplo:

```text
Excelente candidato para futuras vagas de Física.
```

## 40.2. Histórico de observações

Timeline:

```text
01/09 — Gestor A
Boa experiência com vestibulares.

03/09 — Gestor B
Disponibilidade somente no período da manhã.
```

---

# 41. Histórico longitudinal do candidato

O perfil deverá mostrar todas as participações anteriores.

Exemplo:

```text
Histórico

2025.2
Professor de Química
Não selecionado
Mantido no Banco de Talentos

2026-08
Professor de Química — SCS
Aula-teste: 9,1
Status atual: em avaliação
```

Esse histórico é um dos elementos centrais do produto.

---

# 42. Criação manual

Administradores devem conseguir criar candidatos manualmente.

O candidato poderá existir:

* vinculado imediatamente a uma campanha;
* ou apenas no Banco de Talentos.

Isso permite cadastrar indicações e talentos encontrados fora de processos seletivos formais.

---

# 43. Importação dos dados existentes

Existem dados provenientes de diferentes processos e planilhas.

Os arquivos poderão possuir:

* colunas diferentes;
* campos incompletos;
* estruturas diferentes;
* candidatos duplicados.

Para o MVP:

**não construir um importador universal.**

O agente de desenvolvimento deverá:

1. analisar os arquivos fornecidos;
2. identificar colunas;
3. identificar tipos de dados;
4. mapear os dados para o novo modelo;
5. criar scripts específicos de ingestão;
6. registrar origem dos registros importados;
7. identificar possíveis duplicidades;
8. gerar relatório de inconsistências.

---

# 44. Dados anonimizados para desenvolvimento

Os arquivos entregues ao agente poderão conter:

* nomes alterados;
* dados pessoais embaralhados;
* informações anonimizadas.

O agente poderá utilizar:

* estrutura das colunas;
* tipos de dados;
* comprimentos;
* respostas;
* formatos;
* relações entre colunas.

O objetivo é permitir modelagem e desenvolvimento sem necessidade de exposição dos dados reais.

---

# 45. Deduplicação

O sistema deve estar preparado para identificar possíveis candidatos duplicados.

Possíveis sinais:

* mesmo e-mail;
* mesmo telefone;
* CPF, se existir;
* nome semelhante;
* combinação de campos.

Casos incertos devem ser apresentados para revisão humana.

Evitar mesclar automaticamente candidatos sem alta confiança.

---

# 46. Perfis de usuário

O MVP terá três perfis.

## 46.1. Administrador

Pode:

* visualizar tudo;
* cadastrar candidatos;
* editar cadastros;
* administrar campanhas;
* ajustar status;
* configurar pesos;
* corrigir resultados;
* acessar histórico;
* cadastrar usuários;
* administrar configurações.

## 46.2. Avaliador

Pode:

* visualizar candidatos;
* consultar documentos;
* registrar próprias avaliações;
* editar próprias avaliações;
* consultar avaliações de outros após sua avaliação ou mediante ação explícita;
* adicionar observações;
* registrar contatos quando permitido.

Não pode editar avaliação de outro usuário.

## 46.3. Consulta

Pode:

* visualizar candidatos;
* consultar rankings;
* abrir documentos aos quais possuir permissão;
* visualizar avaliações e históricos.

Não pode alterar dados.

---

# 47. Dashboard principal

A home deverá funcionar como dashboard operacional.

Exemplo:

```text
BANCO DE TALENTOS

428 candidatos
73 talentos destacados
52 candidaturas em andamento
18 aguardando avaliação
```

---

# 48. Cards de campanha

Exemplo:

```text
SCS 2026-08
137 candidatos

2025 — 2º semestre
291 candidatos
```

Clique abre a listagem filtrada.

---

# 49. Pendências

Dashboard deverá destacar tarefas importantes.

Exemplos:

```text
32 currículos aguardando avaliação
18 vídeos com apenas 1 avaliação
7 aulas-teste a agendar
12 entrevistas pendentes
9 candidatos aguardando contato
```

Idealmente mostrar também:

```text
Minhas avaliações pendentes
```

---

# 50. Ranking principal

Uma tabela central deverá permitir comparar rapidamente candidatos.

Exemplo:

| Candidato   | Área    | Campanha | Consolidado | Cobertura | Prova | Didática |  CV | Vídeo | Entrevista | Aula |
| ----------- | ------- | -------- | ----------: | --------: | ----: | -------: | --: | ----: | ---------: | ---: |
| Candidato A | Química | 2026-08  |         8,7 |       6/6 |   9,1 |      8,3 | 8,5 |   8,1 |        8,9 |  8,8 |
| Candidato B | Química | 2025.2   |         8,9 |       2/6 |   9,4 |        — | 8,4 |     — |          — |    — |

A cobertura deve ficar visualmente evidente.

---

# 51. Ordenação

A tabela deverá permitir ordenar por:

* resultado consolidado;
* cobertura;
* prova;
* didática;
* currículo;
* vídeo;
* entrevista;
* aula-teste;
* data;
* classificação qualitativa.

---

# 52. Filtros

Filtros sugeridos:

```text
Campanha
Unidade
Disciplina
Segmento
Área
Status operacional
Status seletivo
Classificação de talento
Tags
Cobertura
Faixa de resultado
Etapa concluída
Etapa pendente
Avaliador
Origem
```

Também incluir busca por:

```text
nome
e-mail
telefone
```

---

# 53. Comparação lado a lado

Permitir selecionar aproximadamente 2 a 5 candidatos.

Exemplo:

```text
[✓] Candidato A
[✓] Candidato B
[✓] Candidato C

[Comparar]
```

Tela de comparação:

| Dimensão    |    A |   B |   C |
| ----------- | ---: | --: | --: |
| Consolidado |  8,7 | 8,4 | 8,1 |
| Cobertura   | 100% | 67% | 83% |
| Prova       |  9,1 | 9,5 | 7,8 |
| Didática    |  8,3 |   — | 8,7 |
| Currículo   |  8,5 | 8,1 | 7,9 |
| Vídeo       |  8,1 | 8,4 | 8,2 |
| Entrevista  |  8,9 |   — | 7,8 |
| Aula        |  8,8 | 7,7 | 8,3 |

A seleção deve ser livre, inclusive entre campanhas diferentes.

---

# 54. Perfil do candidato

Estrutura sugerida:

```text
NOME DO CANDIDATO

Química · Ensino Médio
Campanha SCS 2026-08

Resultado consolidado: 8,4
Cobertura: 5/6 dimensões

Classificação:
Forte candidato

Tags:
[Boa didática] [Vestibular] [Ensino Médio]
```

---

# 55. Resumo das dimensões

Exemplo:

| Dimensão       | Resultado | Avaliações |
| -------------- | --------: | ---------: |
| Prova objetiva |       8,7 |          — |
| Didática       |       8,2 |          3 |
| Currículo      |       7,5 |          2 |
| Vídeo          |       8,8 |          3 |
| Entrevista     |       7,9 |          2 |
| Aula-teste     |         — |          — |

---

# 56. Abas do perfil

Sugestão:

```text
Resumo
Candidatura
Respostas
Currículo
Vídeo
Entrevista
Aula-teste
Contatos
Observações
Histórico
```

---

# 57. Performance e experiência de uso

A interface deverá ser otimizada para uso frequente por gestores.

Prioridades:

* abrir rapidamente;
* evitar excesso de formulários;
* permitir avaliações com poucos cliques;
* preservar filtros;
* permitir navegação candidato anterior / próximo;
* reduzir necessidade de voltar constantemente à listagem;
* salvar rascunhos quando adequado;
* fornecer feedback claro de salvamento.

---

# 58. Segurança

A plataforma é exclusivamente interna.

Não haverá acesso público no MVP.

Requisitos:

* autenticação obrigatória;
* controle de acesso por perfil;
* links externos não devem alterar permissões dos documentos;
* dados pessoais nunca devem ser expostos em páginas públicas;
* logs das operações relevantes.

---

# 59. Elementos fora do MVP

Explicitamente fora do escopo atual:

* página pública de vagas;
* publicação de vagas;
* candidatura realizada diretamente na plataforma;
* formulário público de inscrição;
* upload direto de currículo pelo candidato;
* comunicação automática por WhatsApp;
* envio automático de e-mail;
* contratação;
* admissão;
* folha;
* integração completa com RH;
* onboarding de contratado;
* motor universal de importação;
* análise automática de currículo;
* avaliação automática por LLM dentro da plataforma;
* avaliação socioemocional completa;
* alteração dinâmica da rubrica de aula-teste;
* portal do candidato.

---

# 60. Funcionalidades para as quais o banco deve estar preparado

Mesmo fora do MVP, a arquitetura deverá permitir futuramente:

## Portal de candidatura

```text
Vaga
↓
Inscrição
↓
Candidato
↓
Candidatura
```

## Avaliação automática por IA

```text
Resposta
↓
Prompt
↓
Modelo
↓
Execução
↓
Resultado
```

## Extração de currículo

```text
Currículo
↓
Extração estruturada
↓
Formação
Experiência
Segmentos
Disciplinas
Competências
```

## Socioemocional

```text
Questionário
↓
Dimensões
↓
Índices
↓
Resultado geral
```

---

# 61. Modelo conceitual resumido

```text
CANDIDATO
│
├── Áreas de atuação
├── Tags
├── Observações
├── Histórico
│
└── CANDIDATURAS
     │
     ├── CAMPANHA
     ├── VAGAS
     ├── Interesse declarado
     ├── Documentos
     │    ├── Currículo
     │    ├── Vídeo
     │    └── Gravações
     │
     ├── Respostas subjetivas
     │    ├── Pergunta
     │    ├── Resposta
     │    ├── Avaliações humanas
     │    └── Avaliações LLM
     │
     ├── Prova objetiva
     │
     ├── Avaliação currículo
     │
     ├── Avaliação vídeo
     │
     ├── Entrevista
     │
     ├── Aula-teste
     │    ├── Avaliadores
     │    └── Critérios
     │
     ├── Socioemocional [futuro]
     │
     ├── Contatos / CRM
     │
     ├── Status operacional
     └── Status seletivo
```

---

# 62. Regras críticas de negócio

O agente deve tratar as seguintes regras como requisitos centrais:

1. Um candidato pode possuir várias candidaturas.
2. Uma candidatura pertence a uma campanha.
3. O histórico nunca deve ser sobrescrito por campanhas futuras.
4. Currículo e vídeo pertencem à candidatura.
5. Uma dimensão pode possuir múltiplos avaliadores.
6. A média nunca deve substituir os registros individuais.
7. Um avaliador não pode editar a avaliação de outro.
8. Antes da própria avaliação, avaliações dos colegas ficam ocultas por padrão.
9. Avaliações ausentes não contam como zero.
10. O resultado consolidado deve sempre mostrar cobertura.
11. Os pesos de avaliação são globais.
12. Configurações antigas de pesos devem ser rastreáveis.
13. Comparações devem funcionar entre campanhas diferentes.
14. Avaliações por LLM devem aceitar número arbitrário de modelos.
15. Perguntas e respostas devem preservar contexto histórico.
16. Status operacional e status seletivo são conceitos diferentes.
17. Resultado numérico e classificação qualitativa são conceitos diferentes.
18. O candidato pode permanecer no Banco de Talentos mesmo sem ter sido selecionado.
19. O candidato pode ser cadastrado manualmente sem campanha.
20. O MVP não deverá depender de um importador universal.

---

# 63. Estratégia recomendada de implementação

Sugestão de ordem para o agente:

## Fase 1 — Análise dos dados existentes

* ler planilhas;
* inventariar colunas;
* mapear duplicidades;
* identificar campanhas;
* identificar instrumentos;
* identificar dados ausentes;
* produzir relatório de migração.

## Fase 2 — Modelo de dados

Criar:

* candidatos;
* campanhas;
* candidaturas;
* áreas;
* vagas;
* documentos;
* instrumentos;
* avaliações;
* respostas;
* aula-teste;
* contatos;
* observações;
* usuários;
* permissões;
* configurações de pesos.

## Fase 3 — Migração

* criar scripts específicos;
* importar dados anonimizados de teste;
* validar;
* importar dados reais posteriormente.

## Fase 4 — Interface operacional básica

* login;
* dashboard;
* ranking;
* filtros;
* perfil do candidato;
* criação manual.

## Fase 5 — Avaliações

* currículo;
* vídeo;
* respostas;
* entrevista;
* aula-teste.

## Fase 6 — CRM e fluxo seletivo

* status;
* histórico de contato;
* WhatsApp;
* agendamentos;
* pendências.

## Fase 7 — Consolidação

* pesos;
* resultado consolidado;
* cobertura;
* comparação;
* classificação qualitativa.

---

# 64. Critérios de sucesso do MVP

O MVP será considerado funcional quando um gestor conseguir:

1. entrar no sistema;
2. localizar um candidato;
3. consultar todas as participações dele;
4. abrir currículo e vídeo;
5. consultar respostas das perguntas;
6. avaliar currículo;
7. avaliar vídeo;
8. avaliar entrevista;
9. preencher a rubrica da aula-teste;
10. visualizar médias entre avaliadores;
11. visualizar resultado consolidado;
12. entender claramente a cobertura da avaliação;
13. registrar contato;
14. abrir WhatsApp;
15. alterar andamento do processo;
16. classificar candidato para oportunidades futuras;
17. filtrar uma campanha;
18. ordenar candidatos por qualquer dimensão;
19. comparar candidatos;
20. cadastrar manualmente um novo talento.

---

# 65. Orientação ao agente de desenvolvimento

Antes de implementar o banco definitivo, o agente deve analisar cuidadosamente os arquivos fornecidos.

Os arquivos representam processos reais e podem conter informações ou situações não contempladas neste documento.

O agente deverá:

* identificar divergências entre os dados reais e este escopo;
* não descartar informações existentes sem justificativa;
* evitar modelar o banco exclusivamente com base nas colunas das planilhas;
* tratar este documento como definição conceitual do produto;
* utilizar os arquivos como fonte para validar campos e casos reais;
* registrar dúvidas ou inconsistências encontradas;
* privilegiar estruturas extensíveis em vez de soluções específicas para uma única campanha.

O objetivo final não é simplesmente digitalizar as planilhas atuais.

O objetivo é construir uma base permanente que permita acompanhar o relacionamento da escola com seus talentos docentes ao longo de diferentes processos seletivos e anos.
