# Modelo de dados

UUID primários, `timestamptz` para datas. Drizzle schema em `lib/db/schema/`.

## Enums principais

- `staff_role`: admin | avaliador | consulta
- `operational_status`: novo | aguardando_contato | contato_realizado | ...
- `selective_status`: em_avaliacao | avancar | em_duvida | ...
- `talent_classification`: nao_classificado | acompanhar | interessante | prioritario | forte_candidato
- `document_type`: curriculo | video | gravacao_entrevista | outro
- `dimension_code`: prova_conteudo | didatica_objetiva | didatica_humana | curriculo | video | entrevista | aula_teste | socioemocional

## Tabelas

### staff_users
`id`, `email` (citext unique), `name`, `role`, `active`, `neon_auth_user_id`, `created_at`

### candidates
`id`, `full_name`, `email`, `phone`, `city`, `english_level`, `origin`, `highlighted_note`, `talent_classification`, `drive_cv_id` (dedup dev), `created_at`, `updated_at`

### campaigns
`id`, `name`, `slug`, `description`, `starts_at`, `ends_at`, `status`, `created_at`

### units, segments, disciplines, vacancies
Catálogos com `name`, `slug`/`code`

### applications
`id`, `candidate_id`, `campaign_id` (nullable), `discipline_id`, `operational_status`, `selective_status`, `applied_at`, `source`, `candidate_observation`, `differential_text`, `created_at`

### application_interests / application_potentials
`application_id`, `discipline_id`, `segment_id`

### documents
`id`, `application_id`, `type`, `url`, `description`, `document_date`

### dimensions
`id`, `code`, `name`, `sort_order`

### instruments
`id`, `campaign_id`, `code`, `type`, `prompt_text`, `scale_max`, `version`, `needs_source_text`

### subjective_answers
`id`, `application_id`, `instrument_id`, `answer_text`

### evaluations
`id`, `application_id`, `dimension_id`, `instrument_id`, `evaluator_staff_id`, `score_raw`, `scale_max`, `comment`, `blind_peeked_at`, `created_at`, `updated_at`

### evaluation_revisions
`evaluation_id`, `previous_score`, `new_score`, `changed_by_staff_id`, `changed_at`

### llm_evaluations
`id`, `answer_id`, `provider_code`, `model_name`, `score_raw`, `scale_max`, `prompt_snapshot`

### teaching_practice_scores
`application_id`, `practice_code`, `score_raw` (19 práticas, ingestão only)

### imported_dimension_scores
`application_id`, `dimension_id`, `score`, `source` (planilha import)

### lesson_test_criteria, lesson_test_evaluations, lesson_test_scores
Rubrica 14 critérios; avaliação por avaliador; scores por critério

### unmatched_lesson_tests
Avaliações órfãs da ingestão anonimizada

### contacts, notes, tags, application_tags, application_flags
CRM e classificação

### schedules
Entrevista/aula-teste: `application_id`, `type`, `scheduled_at`, `location`, `responsible_staff_id`, `status`

### weight_configs + weight_config_items
`valid_from`, `dimension_id`, `weight` (versão global)

### import_batches, import_row_errors, candidate_merge_suggestions, audit_events

## Índices

- `applications(candidate_id)`, `applications(campaign_id)`, `applications(discipline_id)`, `applications(operational_status)`
- `imported_dimension_scores(application_id)`
- `documents(application_id)`, `subjective_answers(application_id)`, `teaching_practice_scores(application_id)`
- `lesson_test_evaluations(application_id)`, `lesson_test_scores(lesson_test_evaluation_id)`
- `notes(candidate_id)`, `contacts(candidate_id)`, `audit_events(entity_id)`
- `application_interests(application_id)`, `application_potentials(application_id)`, `application_tags(application_id)`
- `schedules(application_id)`, `weight_config_items(weight_config_id)`
- `evaluations(application_id, dimension_id, instrument_id, evaluator_staff_id)` unique
- `candidates(drive_cv_id)` unique, `staff_users(email)` unique
