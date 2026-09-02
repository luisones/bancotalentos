ALTER TABLE "lesson_test_evaluations" ADD COLUMN IF NOT EXISTS "external_ref" text;--> statement-breakpoint
UPDATE "lesson_test_evaluations" AS lte
SET "external_ref" = upper(split_part(s.email, '@', 1))
FROM "staff_users" AS s
WHERE s.id = lte.evaluator_staff_id
  AND s.email LIKE '%@lesson-test.ingest'
  AND lte.external_ref IS NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "lesson_test_evaluations_app_evaluator_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_test_evaluations_external_ref_idx" ON "lesson_test_evaluations" USING btree ("external_ref");--> statement-breakpoint
UPDATE "lesson_test_evaluations" AS lte
SET evaluator_staff_id = real.id
FROM "staff_users" AS fake
JOIN "staff_users" AS real
  ON lower(trim(real.name)) = lower(trim(fake.name))
 AND real.email NOT LIKE '%@lesson-test.ingest'
 AND real.email NOT LIKE '%@exemplo.invalid'
 AND real.email <> 'ingest@internal'
WHERE lte.evaluator_staff_id = fake.id
  AND (
    fake.email LIKE '%@lesson-test.ingest'
    OR fake.email LIKE '%@exemplo.invalid'
  );--> statement-breakpoint
UPDATE "lesson_test_evaluations" AS lte
SET evaluator_staff_id = ingest.id
FROM "staff_users" AS fake, "staff_users" AS ingest
WHERE lte.evaluator_staff_id = fake.id
  AND ingest.email = 'ingest@internal'
  AND (
    fake.email LIKE '%@lesson-test.ingest'
    OR fake.email LIKE '%@exemplo.invalid'
  );--> statement-breakpoint
DELETE FROM "staff_users"
WHERE email LIKE '%@lesson-test.ingest'
   OR email LIKE '%@exemplo.invalid';--> statement-breakpoint
INSERT INTO "staff_users" ("email", "name", "role", "active")
VALUES (
  'rebeca.fazzani@liceujardim.com.br',
  'Rebeca Fazzani',
  'admin',
  true
)
ON CONFLICT ("email") DO UPDATE SET
  "name" = EXCLUDED."name",
  "role" = 'admin',
  "active" = true,
  "updated_at" = now();
