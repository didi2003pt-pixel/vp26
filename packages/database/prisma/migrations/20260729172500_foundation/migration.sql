CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "CommunityType" AS ENUM ('CITY', 'CLUB', 'COMPANY', 'SCHOOL', 'ORGANIZATION');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PENDING', 'REJECTED', 'LEFT');
CREATE TYPE "BoatStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VALIDATION');
CREATE TYPE "BoatNameType" AS ENUM ('PUBLIC', 'TECHNICAL', 'SPONSORED', 'ALIAS');
CREATE TYPE "IdentifierType" AS ENUM ('BOAT_NUMBER', 'SAIL_NUMBER', 'REGISTRATION_ID', 'EXTERNAL_ID');
CREATE TYPE "CertificateType" AS ENUM ('ANC', 'ORC');
CREATE TYPE "CertificateStatus" AS ENUM ('VALID', 'EXPIRED', 'PENDING', 'REPLACED', 'PROVISIONAL', 'REJECTED', 'MISSING');
CREATE TYPE "StageStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PREDICTIONS_OPEN', 'PREDICTIONS_CLOSED', 'IN_PROGRESS', 'PROVISIONAL_RESULTS', 'OFFICIAL_RESULTS', 'POSTPONED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'MARKETING_EMAIL', 'MARKETING_SMS', 'ANALYTICS');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(254) NOT NULL UNIQUE,
  "password_hash" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "email_verified_at" TIMESTAMPTZ(6),
  "failed_login_count" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ(6),
  "last_login_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE "cities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL UNIQUE,
  "country_code" CHAR(2) NOT NULL DEFAULT 'PT',
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("name", "country_code")
);

CREATE TABLE "clubs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(200) NOT NULL UNIQUE,
  "city_id" UUID REFERENCES "cities"("id") ON DELETE SET NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "clubs_city_id_idx" ON "clubs"("city_id");

CREATE TABLE "profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "name" VARCHAR(120) NOT NULL,
  "nickname" VARCHAR(40) NOT NULL UNIQUE,
  "country_code" CHAR(2) NOT NULL DEFAULT 'PT',
  "city_id" UUID REFERENCES "cities"("id") ON DELETE SET NULL,
  "club_id" UUID REFERENCES "clubs"("id") ON DELETE SET NULL,
  "avatar_key" VARCHAR(500),
  "phone" VARCHAR(40),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "profiles_city_id_idx" ON "profiles"("city_id");
CREATE INDEX "profiles_club_id_idx" ON "profiles"("club_id");

CREATE TABLE "roles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) NOT NULL UNIQUE,
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "user_roles" (
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role_id" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "assigned_by" UUID,
  PRIMARY KEY ("user_id", "role_id")
);
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

CREATE TABLE "sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" CHAR(64) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "ip_address" INET,
  "user_agent" VARCHAR(500),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

CREATE TABLE "email_verification_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" CHAR(64) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

CREATE TABLE "password_reset_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" CHAR(64) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

CREATE TABLE "consents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "ConsentType" NOT NULL,
  "version" VARCHAR(50) NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "ip_address" INET,
  "user_agent" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "consents_user_id_type_idx" ON "consents"("user_id", "type");

CREATE TABLE "communities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "CommunityType" NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(200) NOT NULL UNIQUE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "communities_type_idx" ON "communities"("type");

CREATE TABLE "community_memberships" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "community_id" UUID NOT NULL REFERENCES "communities"("id") ON DELETE CASCADE,
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "left_at" TIMESTAMPTZ(6),
  UNIQUE ("user_id", "community_id")
);
CREATE INDEX "community_memberships_community_status_idx" ON "community_memberships"("community_id", "status");

CREATE TABLE "race_classes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(30) NOT NULL UNIQUE,
  "name" VARCHAR(100) NOT NULL,
  "parent_id" UUID REFERENCES "race_classes"("id") ON DELETE SET NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "race_classes_parent_id_idx" ON "race_classes"("parent_id");

CREATE TABLE "boats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "registration_id" VARCHAR(20) NOT NULL UNIQUE,
  "boat_number" VARCHAR(20) NOT NULL UNIQUE,
  "public_name" VARCHAR(180) NOT NULL,
  "technical_name" VARCHAR(180),
  "class_id" UUID NOT NULL REFERENCES "race_classes"("id") ON DELETE RESTRICT,
  "status" "BoatStatus" NOT NULL DEFAULT 'ACTIVE',
  "source_audit_version" VARCHAR(20) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6)
);
CREATE INDEX "boats_class_status_idx" ON "boats"("class_id", "status");

CREATE TABLE "boat_names" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "boat_id" UUID NOT NULL REFERENCES "boats"("id") ON DELETE CASCADE,
  "type" "BoatNameType" NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "valid_from" DATE,
  "valid_until" DATE,
  "is_current" BOOLEAN NOT NULL DEFAULT TRUE,
  "source" VARCHAR(200) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("boat_id", "type", "name")
);
CREATE INDEX "boat_names_name_idx" ON "boat_names"("name");

CREATE TABLE "boat_identifiers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "boat_id" UUID NOT NULL REFERENCES "boats"("id") ON DELETE CASCADE,
  "type" "IdentifierType" NOT NULL,
  "value" VARCHAR(100) NOT NULL,
  "normalized_value" VARCHAR(100) NOT NULL,
  "country_code" VARCHAR(10),
  "suffix" VARCHAR(20),
  "is_current" BOOLEAN NOT NULL DEFAULT TRUE,
  "source" VARCHAR(200) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("type", "normalized_value")
);
CREATE INDEX "boat_identifiers_boat_type_current_idx" ON "boat_identifiers"("boat_id", "type", "is_current");

CREATE TABLE "boat_certificates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "boat_id" UUID NOT NULL REFERENCES "boats"("id") ON DELETE CASCADE,
  "type" "CertificateType" NOT NULL,
  "reference" VARCHAR(100),
  "model" VARCHAR(180),
  "rating_type" VARCHAR(50),
  "rating_value" DECIMAL(12, 6),
  "issued_at" DATE,
  "valid_until" DATE,
  "status" "CertificateStatus" NOT NULL,
  "source_files" JSONB NOT NULL,
  "source_hashes" JSONB NOT NULL,
  "is_current" BOOLEAN NOT NULL DEFAULT TRUE,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "boat_certificates_boat_type_current_idx" ON "boat_certificates"("boat_id", "type", "is_current");

CREATE TABLE "boat_external_identifiers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "boat_id" UUID NOT NULL REFERENCES "boats"("id") ON DELETE CASCADE,
  "provider" VARCHAR(50) NOT NULL,
  "external_id" VARCHAR(200) NOT NULL,
  "external_name" VARCHAR(180),
  "verified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("provider", "external_id")
);
CREATE INDEX "boat_external_identifiers_boat_id_idx" ON "boat_external_identifiers"("boat_id");

CREATE TABLE "sponsors" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(200) NOT NULL UNIQUE,
  "website" VARCHAR(500),
  "logo_key" VARCHAR(500),
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "stages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" INTEGER NOT NULL UNIQUE,
  "slug" VARCHAR(150) NOT NULL UNIQUE,
  "name" VARCHAR(200) NOT NULL,
  "race_type" VARCHAR(100) NOT NULL,
  "start_location" VARCHAR(150),
  "finish_location" VARCHAR(150),
  "stage_date" DATE NOT NULL,
  "predictions_open_at" TIMESTAMPTZ(6),
  "predictions_close_at" TIMESTAMPTZ(6),
  "scheduled_start_at" TIMESTAMPTZ(6),
  "status" "StageStatus" NOT NULL DEFAULT 'DRAFT',
  "image_key" VARCHAR(500),
  "sponsor_id" UUID REFERENCES "sponsors"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "stages_date_status_idx" ON "stages"("stage_date", "status");

CREATE TABLE "stage_classes" (
  "stage_id" UUID NOT NULL REFERENCES "stages"("id") ON DELETE CASCADE,
  "class_id" UUID NOT NULL REFERENCES "race_classes"("id") ON DELETE CASCADE,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY ("stage_id", "class_id")
);
CREATE INDEX "stage_classes_class_id_idx" ON "stage_classes"("class_id");

CREATE TABLE "stage_boats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "stage_id" UUID NOT NULL REFERENCES "stages"("id") ON DELETE CASCADE,
  "boat_id" UUID NOT NULL REFERENCES "boats"("id") ON DELETE CASCADE,
  "eligible_for_prediction" BOOLEAN NOT NULL DEFAULT TRUE,
  "surprise_eligible" BOOLEAN NOT NULL DEFAULT FALSE,
  "participation_source" VARCHAR(200) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("stage_id", "boat_id")
);
CREATE INDEX "stage_boats_boat_id_idx" ON "stage_boats"("boat_id");

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" VARCHAR(200),
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "ip_address" INET,
  "user_agent" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs"("actor_user_id", "created_at");

CREATE TABLE "feature_flags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" VARCHAR(100) NOT NULL UNIQUE,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "description" VARCHAR(500),
  "rules" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "system_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" VARCHAR(100) NOT NULL UNIQUE,
  "value" JSONB NOT NULL,
  "description" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "email_outbox" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "template" VARCHAR(100) NOT NULL,
  "recipient" VARCHAR(254) NOT NULL,
  "subject" VARCHAR(300) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "email_outbox_status_created_idx" ON "email_outbox"("status", "created_at");
