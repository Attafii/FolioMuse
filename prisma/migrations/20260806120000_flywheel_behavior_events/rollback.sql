-- Rollback: flywheel_behavior_events (ADR-0004)
-- Drops ONLY new objects created by migration.sql, in reverse dependency order.

-- DropForeignKey (new table -> existing table)
ALTER TABLE "SignalScore" DROP CONSTRAINT IF EXISTS "SignalScore_patternSignalId_fkey";
ALTER TABLE "RankingScore" DROP CONSTRAINT IF EXISTS "RankingScore_itemId_fkey";
ALTER TABLE "BehaviorEvent" DROP CONSTRAINT IF EXISTS "BehaviorEvent_experimentId_fkey";
ALTER TABLE "BehaviorEvent" DROP CONSTRAINT IF EXISTS "BehaviorEvent_patternSignalId_fkey";
ALTER TABLE "BehaviorEvent" DROP CONSTRAINT IF EXISTS "BehaviorEvent_itemId_fkey";
ALTER TABLE "ExperimentAssignment" DROP CONSTRAINT IF EXISTS "ExperimentAssignment_experimentId_fkey";

-- DropIndex (new-table indexes)
DROP INDEX IF EXISTS "SignalScore_patternSignalId_key";
DROP INDEX IF EXISTS "RankingScore_itemId_key";
DROP INDEX IF EXISTS "BehaviorEvent_eventType_occurredAt_idx";
DROP INDEX IF EXISTS "BehaviorEvent_experimentId_idx";
DROP INDEX IF EXISTS "BehaviorEvent_patternSignalId_idx";
DROP INDEX IF EXISTS "BehaviorEvent_itemId_idx";
DROP INDEX IF EXISTS "BehaviorEvent_idempotencyKey_key";
DROP INDEX IF EXISTS "ExperimentAssignment_experimentId_idx";
DROP INDEX IF EXISTS "ExperimentAssignment_experimentId_subjectKey_key";
DROP INDEX IF EXISTS "Experiment_status_idx";
DROP INDEX IF EXISTS "Experiment_name_key";

-- DropTable (reverse dependency order)
DROP TABLE IF EXISTS "SignalScore";
DROP TABLE IF EXISTS "RankingScore";
DROP TABLE IF EXISTS "BehaviorEvent";
DROP TABLE IF EXISTS "ExperimentAssignment";
DROP TABLE IF EXISTS "Experiment";
