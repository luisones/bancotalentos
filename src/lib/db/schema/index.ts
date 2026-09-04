import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const staffRoleEnum = pgEnum("staff_role", [
  "admin",
  "avaliador",
  "consulta",
]);

export const operationalStatusEnum = pgEnum("operational_status", [
  "novo",
  "aguardando_contato",
  "contato_realizado",
  "aguardando_retorno",
  "entrevista_a_agendar",
  "entrevista_agendada",
  "aula_teste_a_agendar",
  "aula_teste_agendada",
  "avaliacao_pendente",
  "processo_concluido",
]);

export const selectiveStatusEnum = pgEnum("selective_status", [
  "em_avaliacao",
  "avancar",
  "em_duvida",
  "nao_avancar",
  "selecionado",
  "nao_selecionado",
  "manter_no_banco",
]);

export const talentClassificationEnum = pgEnum("talent_classification", [
  "nao_classificado",
  "acompanhar",
  "interessante",
  "prioritario",
  "forte_candidato",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "curriculo",
  "video",
  "gravacao_entrevista",
  "outro",
]);

/**
 * `prova_conteudo` e `didatica_humana` continuam no enum porque um valor de
 * enum do Postgres não se remove — mas nenhuma linha aponta mais para eles:
 * `prova_conteudo` virou `conteudo_objetiva` + `conteudo_dissertativa` e
 * `didatica_humana` era o nome errado de `didatica_dissertativa`, a nota das
 * respostas dissertativas produzida pelo ensemble de LLM.
 */
export const dimensionCodeEnum = pgEnum("dimension_code", [
  "prova_conteudo",
  "didatica_objetiva",
  "didatica_humana",
  "curriculo",
  "video",
  "entrevista",
  "aula_teste",
  "socioemocional",
  "didatica_dissertativa",
  "conteudo_objetiva",
  "conteudo_dissertativa",
]);

/**
 * Status único da candidatura. Funde os três eixos antigos (situação seletiva,
 * etapa operacional, selo de talento) sob uma regra: o desfecho seletivo vence
 * a etapa operacional, e a etapa só aparece enquanto não há desfecho.
 */
export const candidateStatusEnum = pgEnum("candidate_status", [
  "novo",
  "em_avaliacao",
  "a_contatar",
  "aula_teste_agendada",
  "em_duvida",
  "avancar",
  "selecionado",
  "nao_avancar",
  "manter_no_banco",
]);

export const applicationSourceEnum = pgEnum("application_source", [
  "import",
  "manual",
]);

export const scheduleTypeEnum = pgEnum("schedule_type", [
  "entrevista",
  "aula_teste",
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "a_agendar",
  "agendado",
  "realizado",
  "faltou",
  "reagendar",
  "cancelado",
]);

export const contactChannelEnum = pgEnum("contact_channel", [
  "telefone",
  "whatsapp",
  "email",
  "outro",
]);

export const contactResultEnum = pgEnum("contact_result", [
  "nao_respondeu",
  "contato_realizado",
  "retornar_depois",
  "agendado",
  "sem_interesse",
  "indisponivel",
  "outro",
]);

export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: staffRoleEnum("role").notNull().default("avaliador"),
    active: boolean("active").notNull().default(true),
    neonAuthUserId: text("neon_auth_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("staff_users_email_idx").on(t.email)],
);

export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const segments = pgTable("segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const disciplines = pgTable("disciplines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  status: text("status").notNull().default("ativa"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const vacancies = pgTable("vacancies", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  unitId: uuid("unit_id").references(() => units.id),
  segmentId: uuid("segment_id").references(() => segments.id),
  disciplineId: uuid("discipline_id").references(() => disciplines.id),
  title: text("title").notNull(),
  slug: text("slug"),
});

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalRef: text("external_ref"),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    city: text("city"),
    /** 8 dígitos, sem hífen — o formato dos workbooks de origem. */
    postalCode: text("postal_code"),
    /** `workbook` | `csv_2025`: de qual fonte o CEP veio. */
    postalCodeSource: text("postal_code_source"),
    englishLevel: text("english_level"),
    origin: text("origin"),
    highlightedNote: text("highlighted_note"),
    /** Modificador do status único, no lugar das 5 gradações do selo antigo. */
    starred: boolean("starred").notNull().default(false),
    /** @deprecated substituído por `starred`. Mantido até a limpeza física. */
    talentClassification: talentClassificationEnum("talent_classification")
      .notNull()
      .default("nao_classificado"),
    driveCvId: text("drive_cv_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("candidates_external_ref_idx").on(t.externalRef),
    index("candidates_postal_code_idx").on(t.postalCode),
  ],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .references(() => candidates.id)
      .notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    disciplineId: uuid("discipline_id").references(() => disciplines.id),
    /** Status único. Substitui `operationalStatus` + `selectiveStatus`. */
    status: candidateStatusEnum("status").notNull().default("novo"),
    /** @deprecated fundido em `status`. Mantido até a limpeza física. */
    operationalStatus: operationalStatusEnum("operational_status")
      .notNull()
      .default("novo"),
    /** @deprecated fundido em `status`. Mantido até a limpeza física. */
    selectiveStatus: selectiveStatusEnum("selective_status")
      .notNull()
      .default("em_avaliacao"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    source: applicationSourceEnum("source").notNull().default("manual"),
    candidateObservation: text("candidate_observation"),
    differentialText: text("differential_text"),
    externalRef: text("external_ref"),
    examRegistration: text("exam_registration"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("applications_candidate_id_idx").on(t.candidateId),
    index("applications_campaign_id_idx").on(t.campaignId),
    index("applications_discipline_id_idx").on(t.disciplineId),
    index("applications_operational_status_idx").on(t.operationalStatus),
    index("applications_status_idx").on(t.status),
    uniqueIndex("applications_external_ref_idx").on(t.externalRef),
  ],
);

export const applicationInterests = pgTable(
  "application_interests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    disciplineId: uuid("discipline_id").references(() => disciplines.id),
    segmentId: uuid("segment_id").references(() => segments.id),
  },
  (t) => [index("application_interests_application_id_idx").on(t.applicationId)],
);

export const applicationPotentials = pgTable(
  "application_potentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    disciplineId: uuid("discipline_id").references(() => disciplines.id),
    segmentId: uuid("segment_id").references(() => segments.id),
  },
  (t) => [index("application_potentials_application_id_idx").on(t.applicationId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    type: documentTypeEnum("type").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    documentDate: timestamp("document_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("documents_application_id_idx").on(t.applicationId)],
);

export const dimensions = pgTable("dimensions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: dimensionCodeEnum("code").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  /**
   * `didatica` | `conteudo` | null. Dimensão com grupo não entra sozinha no
   * Resultado: entra pela média ponderada do grupo a que pertence.
   */
  groupCode: text("group_code"),
  /** `AT` `DO` `DD` `CD` `CO` `VD` — a fileira de pastilhas do perfil. */
  shortCode: text("short_code"),
  /** Dimensão fora de uso continua existindo para não órfãos os apontamentos. */
  active: boolean("active").notNull().default(true),
});

export const instruments = pgTable("instruments", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  code: text("code").notNull(),
  type: text("type").notNull(),
  promptText: text("prompt_text"),
  scaleMax: numeric("scale_max", { precision: 6, scale: 2 })
    .notNull()
    .default("10"),
  version: integer("version").notNull().default(1),
  needsSourceText: boolean("needs_source_text").notNull().default(false),
});

export const subjectiveAnswers = pgTable(
  "subjective_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    instrumentId: uuid("instrument_id")
      .references(() => instruments.id)
      .notNull(),
    answerText: text("answer_text"),
    /**
     * Nota humana que substitui a do ensemble NESTA pergunta, na mesma escala
     * dos provedores (0–30). Guardada ao lado, nunca por cima: `llm_evaluations`
     * continua intacto e a divergência fica auditável.
     */
    overrideScore: numeric("override_score", { precision: 6, scale: 3 }),
    overrideByStaffId: uuid("override_by_staff_id").references(
      () => staffUsers.id,
    ),
    overrideAt: timestamp("override_at", { withTimezone: true }),
  },
  (t) => [
    index("subjective_answers_application_id_idx").on(t.applicationId),
    index("subjective_answers_has_override_idx")
      .on(t.applicationId)
      .where(sql`${t.overrideScore} is not null`),
  ],
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    dimensionId: uuid("dimension_id")
      .references(() => dimensions.id)
      .notNull(),
    instrumentId: uuid("instrument_id").references(() => instruments.id),
    evaluatorStaffId: uuid("evaluator_staff_id")
      .references(() => staffUsers.id)
      .notNull(),
    scoreRaw: numeric("score_raw", { precision: 8, scale: 4 }).notNull(),
    scaleMax: numeric("scale_max", { precision: 6, scale: 2 })
      .notNull()
      .default("10"),
    comment: text("comment"),
    blindPeekedAt: timestamp("blind_peeked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("evaluations_unique_idx").on(
      t.applicationId,
      t.dimensionId,
      t.instrumentId,
      t.evaluatorStaffId,
    ),
  ],
);

/**
 * Registro de quem revelou avaliações cegas, por dimensão.
 *
 * Antes disto, o peek era um UPDATE em `evaluations.blind_peeked_at` filtrado
 * por `evaluator_staff_id = <quem pediu>` — ou seja, afetava ZERO linhas
 * exatamente para quem ainda não avaliou, que é quem precisa revelar. E
 * `canSeePeerEvaluations` retornava `hasOwn || hasPeeked` com `hasPeeked`
 * logicamente dominado por `hasOwn`, então era código morto.
 *
 * `evaluations.blind_peeked_at` permanece para compatibilidade da ingestão.
 */
export const blindPeeks = pgTable(
  "blind_peeks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    dimensionId: uuid("dimension_id")
      .notNull()
      .references(() => dimensions.id, { onDelete: "cascade" }),
    peekedAt: timestamp("peeked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("blind_peeks_unique_idx").on(
      t.staffId,
      t.applicationId,
      t.dimensionId,
    ),
    index("blind_peeks_application_idx").on(t.applicationId),
  ],
);

export const evaluationRevisions = pgTable("evaluation_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  evaluationId: uuid("evaluation_id")
    .references(() => evaluations.id)
    .notNull(),
  previousScore: numeric("previous_score", { precision: 8, scale: 4 }).notNull(),
  newScore: numeric("new_score", { precision: 8, scale: 4 }).notNull(),
  changedByStaffId: uuid("changed_by_staff_id").references(() => staffUsers.id),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const llmEvaluations = pgTable(
  "llm_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    answerId: uuid("answer_id")
      .references(() => subjectiveAnswers.id)
      .notNull(),
    providerCode: text("provider_code").notNull(),
    modelName: text("model_name"),
    scoreRaw: numeric("score_raw", { precision: 8, scale: 4 }).notNull(),
    scaleMax: numeric("scale_max", { precision: 6, scale: 2 })
      .notNull()
      .default("30"),
    promptSnapshot: text("prompt_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("llm_evaluations_answer_id_idx").on(t.answerId)],
);

export const teachingPracticeScores = pgTable(
  "teaching_practice_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    practiceCode: text("practice_code").notNull(),
    scoreRaw: numeric("score_raw", { precision: 8, scale: 4 }).notNull(),
    rawResponse: numeric("raw_response", { precision: 8, scale: 4 }),
    weight: numeric("weight", { precision: 8, scale: 4 }),
    direction: text("direction"),
  },
  (t) => [
    index("teaching_practice_scores_application_id_idx").on(t.applicationId),
    uniqueIndex("teaching_practice_scores_app_practice_idx").on(
      t.applicationId,
      t.practiceCode,
    ),
  ],
);

export const importedDimensionScores = pgTable(
  "imported_dimension_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    dimensionId: uuid("dimension_id")
      .references(() => dimensions.id)
      .notNull(),
    score: numeric("score", { precision: 8, scale: 4 }).notNull(),
    source: text("source").notNull().default("planilha_2025"),
  },
  (t) => [
    index("imported_dimension_scores_application_id_idx").on(t.applicationId),
    uniqueIndex("imported_dimension_scores_app_dim_idx").on(
      t.applicationId,
      t.dimensionId,
    ),
  ],
);

export const lessonTestCriteria = pgTable("lesson_test_criteria", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lessonTestEvaluations = pgTable(
  "lesson_test_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    evaluatorStaffId: uuid("evaluator_staff_id")
      .references(() => staffUsers.id)
      .notNull(),
    /** Identificador da planilha (`AT-2025-18`). Uma candidatura pode ter várias aulas. */
    externalRef: text("external_ref"),
    vacancyLabel: text("vacancy_label"),
    comment: text("comment"),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("lesson_test_evaluations_application_id_idx").on(t.applicationId),
    uniqueIndex("lesson_test_evaluations_external_ref_idx").on(t.externalRef),
  ],
);

export const lessonTestScores = pgTable(
  "lesson_test_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonTestEvaluationId: uuid("lesson_test_evaluation_id")
      .references(() => lessonTestEvaluations.id)
      .notNull(),
    criterionId: uuid("criterion_id")
      .references(() => lessonTestCriteria.id)
      .notNull(),
    score: numeric("score", { precision: 8, scale: 4 }).notNull(),
  },
  (t) => [
    index("lesson_test_scores_eval_id_idx").on(t.lessonTestEvaluationId),
  ],
);

export const unmatchedLessonTests = pgTable("unmatched_lesson_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateNameRaw: text("candidate_name_raw"),
  evaluatorEmail: text("evaluator_email"),
  vacancyLabel: text("vacancy_label"),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id").references(() => candidates.id),
    applicationId: uuid("application_id").references(() => applications.id),
    staffId: uuid("staff_id")
      .references(() => staffUsers.id)
      .notNull(),
    contactedAt: timestamp("contacted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    channel: contactChannelEnum("channel").notNull(),
    result: contactResultEnum("result").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("contacts_candidate_id_idx").on(t.candidateId)],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id").references(() => candidates.id),
    applicationId: uuid("application_id").references(() => applications.id),
    staffId: uuid("staff_id")
      .references(() => staffUsers.id)
      .notNull(),
    body: text("body").notNull(),
    isHighlighted: boolean("is_highlighted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("notes_candidate_id_idx").on(t.candidateId)],
);

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const applicationTags = pgTable(
  "application_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id)
      .notNull(),
  },
  (t) => [index("application_tags_application_id_idx").on(t.applicationId)],
);

export const applicationFlags = pgTable("application_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .references(() => applications.id)
    .notNull(),
  flagCode: text("flag_code").notNull(),
  active: boolean("active").notNull().default(true),
});

export const secondPhaseConfirmations = pgTable(
  "second_phase_confirmations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id)
      .notNull(),
    candidateId: uuid("candidate_id")
      .references(() => candidates.id)
      .notNull(),
    externalRef: text("external_ref").notNull(),
    examChoice: text("exam_choice").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    emailDiverged: boolean("email_diverged").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("second_phase_confirmations_campaign_id_idx").on(t.campaignId),
    index("second_phase_confirmations_candidate_id_idx").on(t.candidateId),
    uniqueIndex("second_phase_confirmations_external_ref_idx").on(t.externalRef),
  ],
);

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    type: scheduleTypeEnum("type").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    location: text("location"),
    responsibleStaffId: uuid("responsible_staff_id").references(
      () => staffUsers.id,
    ),
    status: scheduleStatusEnum("status").notNull().default("a_agendar"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("schedules_application_id_idx").on(t.applicationId)],
);

export const weightConfigs = pgTable("weight_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdByStaffId: uuid("created_by_staff_id").references(() => staffUsers.id),
});

export const weightConfigItems = pgTable(
  "weight_config_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weightConfigId: uuid("weight_config_id")
      .references(() => weightConfigs.id)
      .notNull(),
    /**
     * Peso de uma PARTE dentro do grupo (ex.: conteudo_dissertativa vale 2 e
     * conteudo_objetiva vale 1, que é a fórmula (OBJ + 2*DISC)/3 da planilha de
     * 2025 virando configuração). Exclusivo com `groupCode`.
     */
    dimensionId: uuid("dimension_id").references(() => dimensions.id),
    /** Peso de um GRUPO no Resultado. Exclusivo com `dimensionId`. */
    groupCode: text("group_code"),
    weight: numeric("weight", { precision: 6, scale: 4 }).notNull(),
  },
  (t) => [index("weight_config_items_config_id_idx").on(t.weightConfigId)],
);

/**
 * Cache de geocodificação, por CEP e não por candidato: CEPs se repetem entre
 * candidatos, e BrasilAPI/Nominatim são serviços públicos sem SLA. Nenhuma
 * leitura da aplicação sai para a rede — ela só faz JOIN aqui.
 */
export const cepLocations = pgTable("cep_locations", {
  cep: text("cep").primaryKey(),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  city: text("city"),
  uf: text("uf"),
  /** `rua` | `bairro` | `cidade` — o grau de aproximação, exibido na UI. */
  precision: text("precision"),
  source: text("source"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const cepDistances = pgTable("cep_distances", {
  cep: text("cep")
    .primaryKey()
    .references(() => cepLocations.cep, { onDelete: "cascade" }),
  kmSantoAndre: numeric("km_santo_andre", { precision: 8, scale: 2 }),
  kmSaoCaetano: numeric("km_sao_caetano", { precision: 8, scale: 2 }),
  /** `rodoviaria` (OSRM) | `linha_reta` (haversine, quando o roteador falha). */
  mode: text("mode"),
  computedAt: timestamp("computed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const importBatches = pgTable("import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceFile: text("source_file").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  rowCount: integer("row_count"),
  errorCount: integer("error_count").default(0),
});

export const importRowErrors = pgTable("import_row_errors", {
  id: uuid("id").defaultRandom().primaryKey(),
  importBatchId: uuid("import_batch_id")
    .references(() => importBatches.id)
    .notNull(),
  rowNumber: integer("row_number"),
  message: text("message").notNull(),
  payload: jsonb("payload"),
});

export const candidateMergeSuggestions = pgTable("candidate_merge_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateAId: uuid("candidate_a_id")
    .references(() => candidates.id)
    .notNull(),
  candidateBId: uuid("candidate_b_id")
    .references(() => candidates.id)
    .notNull(),
  reason: text("reason").notNull(),
  confidence: text("confidence").notNull().default("low"),
  resolved: boolean("resolved").notNull().default(false),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffId: uuid("staff_id").references(() => staffUsers.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("audit_events_entity_id_idx").on(t.entityId)],
);
