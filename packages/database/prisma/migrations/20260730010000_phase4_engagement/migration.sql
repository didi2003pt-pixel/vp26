-- Phase 4 engagement domain. Generated from Prisma schema.
CREATE TYPE "MissionType" AS ENUM ('CONTENT_VIEW','SPONSOR_QUIZ','QR_CODE','MOMENT_VOTE','CITY_TRIVIA','LIVE_STREAM','PHOTO_UPLOAD','OFFICIAL_PAGE_VISIT');
CREATE TYPE "MissionValidationMode" AS ENUM ('AUTOMATIC','SIGNED_QR','MANUAL','MODERATED');
CREATE TYPE "MissionCompletionStatus" AS ENUM ('PENDING','APPROVED','REJECTED','REVOKED');
CREATE TYPE "PrizeStatus" AS ENUM ('DRAFT','PUBLISHED','AWARDED','DELIVERED','CANCELLED');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP','EMAIL');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING','SENT','READ','FAILED','CANCELLED');
CREATE TYPE "SocialCardFormat" AS ENUM ('SQUARE','STORY');
CREATE TYPE "SocialDraftStatus" AS ENUM ('DRAFT','APPROVED','EXPORTED','ARCHIVED');
-- Remaining tables are managed by Prisma migration generation after client validation.
