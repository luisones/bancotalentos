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

export const dimensionCodeEnum = pgEnum("dimension_code", [
  "prova_conteudo",
  "didatica_objetiva",
  "didatica_humana",
  "curriculo",
  "video",
  "entrevista",
  "aula_teste",
  "socioemocional",
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
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    city: text("city"),
    englishLevel: text("english_level"),
    origin: text("origin"),
    highlightedNote: text("highlighted_note"),
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
  (t) => [uniqueIndex("candidates_drive_cv_id_idx").on(t.driveCvId)],
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
    operationalStatus: operationalStatusEnum("operational_status")
      .notNull()
      .default("novo"),
    selectiveStatus: selectiveStatusEnum("selective_status")
      .notNull()
      .default("em_avaliacao"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    source: applicationSourceEnum("source").notNull().default("manual"),
    candidateObservation: text("candidate_observation"),
    differentialText: text("differential_text"),
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
  },
  (t) => [index("subjective_answers_application_id_idx").on(t.applicationId)],
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

export const llmEvaluations = pgTable("llm_evaluations", {
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
});

export const teachingPracticeScores = pgTable(
  "teaching_practice_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id)
      .notNull(),
    practiceCode: text("practice_code").notNull(),
    scoreRaw: numeric("score_raw", { precision: 8, scale: 4 }).notNull(),
  },
  (t) => [
    index("teaching_practice_scores_application_id_idx").on(t.applicationId),
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
    vacancyLabel: text("vacancy_label"),
    comment: text("comment"),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("lesson_test_evaluations_application_id_idx").on(t.applicationId),
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
    dimensionId: uuid("dimension_id")
      .references(() => dimensions.id)
      .notNull(),
    weight: numeric("weight", { precision: 6, scale: 4 }).notNull(),
  },
  (t) => [index("weight_config_items_config_id_idx").on(t.weightConfigId)],
);

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
