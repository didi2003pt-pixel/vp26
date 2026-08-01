-- Phase 5: privacy operations, security events, retention and backup audit.

CREATE TYPE "DataSubjectRequestType" AS ENUM (
  'ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'PORTABILITY', 'OBJECTION'
);
CREATE TYPE "DataSubjectRequestStatus" AS ENUM (
  'RECEIVED', 'IDENTITY_VERIFICATION', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'
);
CREATE TYPE "SecurityEventSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "RetentionRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "BackupRunStatus" AS ENUM ('STARTED', 'COMPLETED', 'VERIFIED', 'FAILED');

ALTER TABLE "sessions"
  ADD COLUMN "ip_hash" CHAR(64),
  ADD COLUMN "request_id" VARCHAR(128);

ALTER TABLE "consents"
  ADD COLUMN "ip_hash" CHAR(64),
  ADD COLUMN "request_id" VARCHAR(128);

ALTER TABLE "audit_logs"
  ADD COLUMN "ip_hash" CHAR(64),
  ADD COLUMN "request_id" VARCHAR(128);

CREATE TABLE "data_subject_requests" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID,
  "requester_email" VARCHAR(254) NOT NULL,
  "type" "DataSubjectRequestType" NOT NULL,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'RECEIVED',
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "due_at" TIMESTAMPTZ(6) NOT NULL,
  "identity_verified_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "handled_by_id" UUID,
  "decision" VARCHAR(100),
  "response_summary" TEXT,
  "internal_notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL
);

CREATE TABLE "security_events" (
  "id" UUID PRIMARY KEY,
  "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'INFO',
  "event_type" VARCHAR(100) NOT NULL,
  "actor_user_id" UUID,
  "request_id" VARCHAR(128),
  "ip_hash" CHAR(64),
  "route" VARCHAR(500),
  "method" VARCHAR(12),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "retention_runs" (
  "id" UUID PRIMARY KEY,
  "status" "RetentionRunStatus" NOT NULL DEFAULT 'RUNNING',
  "policy" JSONB NOT NULL,
  "summary" JSONB,
  "error" TEXT,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6)
);

CREATE TABLE "backup_runs" (
  "id" UUID PRIMARY KEY,
  "status" "BackupRunStatus" NOT NULL DEFAULT 'STARTED',
  "backup_type" VARCHAR(50) NOT NULL,
  "storage_key" VARCHAR(1000),
  "sha256" CHAR(64),
  "encrypted" BOOLEAN NOT NULL DEFAULT FALSE,
  "size_bytes" BIGINT,
  "metadata" JSONB,
  "error" TEXT,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6)
);

ALTER TABLE "data_subject_requests"
  ADD CONSTRAINT "data_subject_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "data_subject_requests"
  ADD CONSTRAINT "data_subject_requests_handled_by_id_fkey"
  FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "security_events"
  ADD CONSTRAINT "security_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "data_subject_requests_user_id_status_idx"
  ON "data_subject_requests"("user_id", "status");
CREATE INDEX "data_subject_requests_status_due_at_idx"
  ON "data_subject_requests"("status", "due_at");
CREATE INDEX "data_subject_requests_requester_email_received_at_idx"
  ON "data_subject_requests"("requester_email", "received_at");

CREATE INDEX "security_events_severity_created_at_idx"
  ON "security_events"("severity", "created_at");
CREATE INDEX "security_events_event_type_created_at_idx"
  ON "security_events"("event_type", "created_at");
CREATE INDEX "security_events_actor_user_id_created_at_idx"
  ON "security_events"("actor_user_id", "created_at");
CREATE INDEX "security_events_request_id_idx"
  ON "security_events"("request_id");

CREATE INDEX "retention_runs_status_started_at_idx"
  ON "retention_runs"("status", "started_at");
CREATE INDEX "backup_runs_status_started_at_idx"
  ON "backup_runs"("status", "started_at");
