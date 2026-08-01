-- Fase 2: mercados de previsão, pergunta especial e palpites.
-- Não inclui resultados, pontuação ou rankings.

CREATE TYPE "PredictionMarketStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "SpecialQuestionType" AS ENUM ('SINGLE_CHOICE', 'TRUE_FALSE', 'EXACT_NUMBER', 'NUMERIC_RANGE', 'TIME_DIFFERENCE', 'TIME_RANGE');
CREATE TYPE "PredictionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED', 'VOID');

CREATE TABLE "prediction_markets" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "code" VARCHAR(180) NOT NULL,
    "status" "PredictionMarketStatus" NOT NULL DEFAULT 'DRAFT',
    "opens_at" TIMESTAMPTZ(6),
    "closes_at" TIMESTAMPTZ(6),
    "allow_surprise_in_podium" BOOLEAN NOT NULL DEFAULT false,
    "max_podium_position" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "prediction_markets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prediction_markets_valid_window" CHECK ("opens_at" IS NULL OR "closes_at" IS NULL OR "opens_at" < "closes_at"),
    CONSTRAINT "prediction_markets_podium_size" CHECK ("max_podium_position" = 3)
);

CREATE TABLE "special_questions" (
    "id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "type" "SpecialQuestionType" NOT NULL,
    "prompt" VARCHAR(500) NOT NULL,
    "help_text" VARCHAR(500),
    "points" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "correct_answer" JSONB,
    "tolerance" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "special_questions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "special_questions_points_non_negative" CHECK ("points" >= 0)
);

CREATE TABLE "special_question_options" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "special_question_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "predictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "status" "PredictionStatus" NOT NULL DEFAULT 'DRAFT',
    "surprise_boat_id" UUID,
    "special_answer" JSONB,
    "submitted_at" TIMESTAMPTZ(6),
    "locked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "predictions_lock_consistency" CHECK ("status" <> 'LOCKED' OR "locked_at" IS NOT NULL)
);

CREATE TABLE "prediction_podium" (
    "prediction_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "boat_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prediction_podium_pkey" PRIMARY KEY ("prediction_id", "position"),
    CONSTRAINT "prediction_podium_position" CHECK ("position" BETWEEN 1 AND 3)
);

CREATE TABLE "prediction_revisions" (
    "id" UUID NOT NULL,
    "prediction_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "reason" VARCHAR(100) NOT NULL,
    "before_snapshot" JSONB,
    "after_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prediction_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prediction_markets_code_key" ON "prediction_markets"("code");
CREATE UNIQUE INDEX "prediction_markets_stage_id_class_id_key" ON "prediction_markets"("stage_id", "class_id");
CREATE INDEX "prediction_markets_status_opens_at_closes_at_idx" ON "prediction_markets"("status", "opens_at", "closes_at");
CREATE INDEX "prediction_markets_class_id_idx" ON "prediction_markets"("class_id");

CREATE UNIQUE INDEX "special_questions_market_id_key" ON "special_questions"("market_id");
CREATE UNIQUE INDEX "special_question_options_question_id_value_key" ON "special_question_options"("question_id", "value");
CREATE INDEX "special_question_options_question_id_sort_order_idx" ON "special_question_options"("question_id", "sort_order");

CREATE UNIQUE INDEX "predictions_user_id_market_id_key" ON "predictions"("user_id", "market_id");
CREATE INDEX "predictions_market_id_status_submitted_at_idx" ON "predictions"("market_id", "status", "submitted_at");
CREATE INDEX "predictions_surprise_boat_id_idx" ON "predictions"("surprise_boat_id");

CREATE UNIQUE INDEX "prediction_podium_prediction_id_boat_id_key" ON "prediction_podium"("prediction_id", "boat_id");
CREATE INDEX "prediction_podium_boat_id_idx" ON "prediction_podium"("boat_id");

CREATE INDEX "prediction_revisions_prediction_id_created_at_idx" ON "prediction_revisions"("prediction_id", "created_at");
CREATE INDEX "prediction_revisions_actor_user_id_idx" ON "prediction_revisions"("actor_user_id");

ALTER TABLE "prediction_markets" ADD CONSTRAINT "prediction_markets_stage_id_fkey"
FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prediction_markets" ADD CONSTRAINT "prediction_markets_class_id_fkey"
FOREIGN KEY ("class_id") REFERENCES "race_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "special_questions" ADD CONSTRAINT "special_questions_market_id_fkey"
FOREIGN KEY ("market_id") REFERENCES "prediction_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "special_question_options" ADD CONSTRAINT "special_question_options_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "special_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_market_id_fkey"
FOREIGN KEY ("market_id") REFERENCES "prediction_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_surprise_boat_id_fkey"
FOREIGN KEY ("surprise_boat_id") REFERENCES "boats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prediction_podium" ADD CONSTRAINT "prediction_podium_prediction_id_fkey"
FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prediction_podium" ADD CONSTRAINT "prediction_podium_boat_id_fkey"
FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prediction_revisions" ADD CONSTRAINT "prediction_revisions_prediction_id_fkey"
FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prediction_revisions" ADD CONSTRAINT "prediction_revisions_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
