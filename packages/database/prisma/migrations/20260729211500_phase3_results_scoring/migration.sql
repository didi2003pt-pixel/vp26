CREATE TYPE "ResultImportProvider" AS ENUM ('SAILTI_API', 'SAILTI_XRR', 'SAILTI_FILE', 'SAILTI_HTML', 'MANUAL');
CREATE TYPE "ResultImportFormat" AS ENUM ('JSON', 'CSV', 'XRR_XML', 'MANUAL');
CREATE TYPE "ResultImportStatus" AS ENUM ('DRAFT', 'PARSED', 'NEEDS_REVIEW', 'READY', 'CONFIRMED', 'REJECTED', 'FAILED');
CREATE TYPE "ResultImportRowStatus" AS ENUM ('MATCHED', 'AMBIGUOUS', 'UNMATCHED', 'INVALID', 'IGNORED');
CREATE TYPE "ResultStatus" AS ENUM ('PROVISIONAL', 'OFFICIAL', 'SUPERSEDED', 'REJECTED');
CREATE TYPE "ResultEntryStatus" AS ENUM ('CLASSIFIED', 'DNF', 'DNS', 'DNC', 'DSQ', 'RET', 'OCS', 'BFD', 'UFD', 'SCP', 'RDG');
CREATE TYPE "CalculationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SUPERSEDED');
CREATE TYPE "ScoreEventStatus" AS ENUM ('PROVISIONAL', 'DEFINITIVE', 'VOID');
CREATE TYPE "RankingScope" AS ENUM ('GENERAL', 'STAGE', 'CITY', 'CLUB', 'COMMUNITY');
CREATE TYPE "RankingStatus" AS ENUM ('PROVISIONAL', 'DEFINITIVE', 'SUPERSEDED');

CREATE TABLE "result_imports" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" "ResultImportProvider" NOT NULL,
  "format" "ResultImportFormat" NOT NULL,
  "status" "ResultImportStatus" NOT NULL DEFAULT 'DRAFT',
  "stage_id" UUID NOT NULL REFERENCES "stages"("id") ON DELETE RESTRICT,
  "class_id" UUID NOT NULL REFERENCES "race_classes"("id") ON DELETE RESTRICT,
  "source_name" VARCHAR(300) NOT NULL,
  "source_url" VARCHAR(1000),
  "source_hash" CHAR(64) NOT NULL,
  "source_size" INTEGER NOT NULL,
  "raw_payload" TEXT NOT NULL,
  "parsed_payload" JSONB,
  "parser_version" VARCHAR(50) NOT NULL,
  "uploaded_by_id" UUID,
  "confirmed_by_id" UUID,
  "confirmed_at" TIMESTAMPTZ(6),
  "failure_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("provider", "source_hash", "stage_id", "class_id")
);
CREATE INDEX "result_imports_status_created_at_idx" ON "result_imports"("status", "created_at");
CREATE INDEX "result_imports_stage_id_class_id_idx" ON "result_imports"("stage_id", "class_id");

CREATE TABLE "result_import_rows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "import_id" UUID NOT NULL REFERENCES "result_imports"("id") ON DELETE CASCADE,
  "row_number" INTEGER NOT NULL,
  "status" "ResultImportRowStatus" NOT NULL,
  "raw" JSONB NOT NULL,
  "normalized" JSONB,
  "boat_id" UUID REFERENCES "boats"("id") ON DELETE SET NULL,
  "match_confidence" DECIMAL(5,4),
  "match_reason" VARCHAR(500),
  "errors" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("import_id", "row_number")
);
CREATE INDEX "result_import_rows_import_id_status_idx" ON "result_import_rows"("import_id", "status");
CREATE INDEX "result_import_rows_boat_id_idx" ON "result_import_rows"("boat_id");

CREATE TABLE "stage_results" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "stage_id" UUID NOT NULL REFERENCES "stages"("id") ON DELETE RESTRICT,
  "class_id" UUID NOT NULL REFERENCES "race_classes"("id") ON DELETE RESTRICT,
  "import_id" UUID UNIQUE REFERENCES "result_imports"("id") ON DELETE SET NULL,
  "version" INTEGER NOT NULL,
  "status" "ResultStatus" NOT NULL,
  "is_current" BOOLEAN NOT NULL DEFAULT TRUE,
  "published_at" TIMESTAMPTZ(6),
  "confirmed_at" TIMESTAMPTZ(6),
  "confirmed_by_id" UUID,
  "source_hash" CHAR(64),
  "special_answer" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("stage_id", "class_id", "version")
);
CREATE INDEX "stage_results_stage_id_class_id_is_current_status_idx" ON "stage_results"("stage_id", "class_id", "is_current", "status");

CREATE TABLE "stage_result_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "result_id" UUID NOT NULL REFERENCES "stage_results"("id") ON DELETE CASCADE,
  "boat_id" UUID NOT NULL REFERENCES "boats"("id") ON DELETE RESTRICT,
  "position" INTEGER,
  "status" "ResultEntryStatus" NOT NULL DEFAULT 'CLASSIFIED',
  "elapsed_seconds" INTEGER,
  "corrected_seconds" INTEGER,
  "penalty_code" VARCHAR(50),
  "external_entry_id" VARCHAR(200),
  "notes" TEXT,
  "raw" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("result_id", "boat_id")
);
CREATE INDEX "stage_result_entries_result_id_status_position_idx" ON "stage_result_entries"("result_id", "status", "position");
CREATE INDEX "stage_result_entries_boat_id_idx" ON "stage_result_entries"("boat_id");
ALTER TABLE "stage_result_entries" ADD CONSTRAINT "stage_result_entries_position_check" CHECK (
  ("status" = 'CLASSIFIED' AND "position" IS NOT NULL AND "position" > 0)
  OR ("status" <> 'CLASSIFIED' AND "position" IS NULL)
);

CREATE TABLE "scoring_rule_sets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "class_id" UUID NOT NULL REFERENCES "race_classes"("id") ON DELETE RESTRICT,
  "code" VARCHAR(100) NOT NULL,
  "version" INTEGER NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT FALSE,
  "valid_from" TIMESTAMPTZ(6),
  "valid_until" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("code", "version")
);
CREATE INDEX "scoring_rule_sets_class_id_active_idx" ON "scoring_rule_sets"("class_id", "active");

ALTER TABLE "prediction_markets"
  ADD COLUMN "scoring_rule_set_id" UUID REFERENCES "scoring_rule_sets"("id") ON DELETE SET NULL;
CREATE INDEX "prediction_markets_scoring_rule_set_id_idx" ON "prediction_markets"("scoring_rule_set_id");

CREATE TABLE "scoring_rules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_set_id" UUID NOT NULL REFERENCES "scoring_rule_sets"("id") ON DELETE CASCADE,
  "code" VARCHAR(100) NOT NULL,
  "points" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "config" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("rule_set_id", "code")
);

CREATE TABLE "calculation_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "result_id" UUID NOT NULL REFERENCES "stage_results"("id") ON DELETE RESTRICT,
  "rule_set_id" UUID NOT NULL REFERENCES "scoring_rule_sets"("id") ON DELETE RESTRICT,
  "run_number" INTEGER NOT NULL,
  "status" "CalculationRunStatus" NOT NULL DEFAULT 'PENDING',
  "is_current" BOOLEAN NOT NULL DEFAULT FALSE,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "triggered_by_id" UUID,
  "error" TEXT,
  "summary" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("result_id", "run_number")
);
CREATE INDEX "calculation_runs_status_created_at_idx" ON "calculation_runs"("status", "created_at");
CREATE INDEX "calculation_runs_result_id_is_current_idx" ON "calculation_runs"("result_id", "is_current");

CREATE TABLE "score_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "calculation_run_id" UUID NOT NULL REFERENCES "calculation_runs"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "prediction_id" UUID NOT NULL REFERENCES "predictions"("id") ON DELETE CASCADE,
  "market_id" UUID NOT NULL REFERENCES "prediction_markets"("id") ON DELETE CASCADE,
  "rule_code" VARCHAR(100) NOT NULL,
  "subject_key" VARCHAR(200) NOT NULL,
  "points" INTEGER NOT NULL,
  "explanation" VARCHAR(1000) NOT NULL,
  "status" "ScoreEventStatus" NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("calculation_run_id", "prediction_id", "rule_code", "subject_key")
);
CREATE INDEX "score_events_user_id_market_id_idx" ON "score_events"("user_id", "market_id");
CREATE INDEX "score_events_calculation_run_id_user_id_idx" ON "score_events"("calculation_run_id", "user_id");

CREATE TABLE "user_stage_scores" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "market_id" UUID NOT NULL REFERENCES "prediction_markets"("id") ON DELETE CASCADE,
  "result_id" UUID NOT NULL REFERENCES "stage_results"("id") ON DELETE RESTRICT,
  "calculation_run_id" UUID NOT NULL REFERENCES "calculation_runs"("id") ON DELETE RESTRICT,
  "points" INTEGER NOT NULL,
  "breakdown" JSONB NOT NULL,
  "status" "ScoreEventStatus" NOT NULL,
  "calculated_at" TIMESTAMPTZ(6) NOT NULL,
  "prediction_submitted_at" TIMESTAMPTZ(6),
  UNIQUE ("user_id", "market_id")
);
CREATE INDEX "user_stage_scores_market_id_points_idx" ON "user_stage_scores"("market_id", "points");
CREATE INDEX "user_stage_scores_user_id_calculated_at_idx" ON "user_stage_scores"("user_id", "calculated_at");

CREATE TABLE "user_total_scores" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "class_id" UUID NOT NULL REFERENCES "race_classes"("id") ON DELETE CASCADE,
  "points" INTEGER NOT NULL DEFAULT 0,
  "stage_count" INTEGER NOT NULL DEFAULT 0,
  "winner_exact_count" INTEGER NOT NULL DEFAULT 0,
  "exact_podium_count" INTEGER NOT NULL DEFAULT 0,
  "surprise_correct_count" INTEGER NOT NULL DEFAULT 0,
  "special_correct_count" INTEGER NOT NULL DEFAULT 0,
  "numeric_error_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "participation_bonus_count" INTEGER NOT NULL DEFAULT 0,
  "last_prediction_submitted_at" TIMESTAMPTZ(6),
  "last_calculated_at" TIMESTAMPTZ(6) NOT NULL,
  UNIQUE ("user_id", "class_id")
);
CREATE INDEX "user_total_scores_class_id_points_idx" ON "user_total_scores"("class_id", "points");

CREATE TABLE "ranking_snapshots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "scope" "RankingScope" NOT NULL,
  "status" "RankingStatus" NOT NULL,
  "stage_id" UUID NOT NULL REFERENCES "stages"("id") ON DELETE RESTRICT,
  "class_id" UUID NOT NULL REFERENCES "race_classes"("id") ON DELETE CASCADE,
  "scope_ref_id" VARCHAR(200),
  "scope_ref_label" VARCHAR(200),
  "calculation_run_id" UUID REFERENCES "calculation_runs"("id") ON DELETE SET NULL,
  "methodology" VARCHAR(300) NOT NULL,
  "generated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "ranking_snapshots_scope_class_id_generated_at_idx" ON "ranking_snapshots"("scope", "class_id", "generated_at");
CREATE INDEX "ranking_snapshots_stage_id_class_id_idx" ON "ranking_snapshots"("stage_id", "class_id");

CREATE TABLE "ranking_snapshot_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "snapshot_id" UUID NOT NULL REFERENCES "ranking_snapshots"("id") ON DELETE CASCADE,
  "rank" INTEGER NOT NULL,
  "subject_id" VARCHAR(200) NOT NULL,
  "display_name" VARCHAR(200) NOT NULL,
  "points" DECIMAL(18,4) NOT NULL,
  "raw_points" INTEGER NOT NULL,
  "participants" INTEGER NOT NULL DEFAULT 1,
  "metrics" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("snapshot_id", "rank"),
  UNIQUE ("snapshot_id", "subject_id")
);
CREATE INDEX "ranking_snapshot_entries_snapshot_id_points_idx" ON "ranking_snapshot_entries"("snapshot_id", "points");
