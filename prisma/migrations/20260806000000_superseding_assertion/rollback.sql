-- Rollback: superseding_assertion (ADR-0003 D5)
-- Drops ONLY new objects created by migration.sql, in reverse dependency order.

-- DropForeignKey (new table -> existing table)
ALTER TABLE "SupersedingAssertion" DROP CONSTRAINT IF EXISTS "SupersedingAssertion_targetItemId_fkey";

-- DropIndex (new-table indexes)
DROP INDEX IF EXISTS "SupersedingAssertion_recordedAt_idx";
DROP INDEX IF EXISTS "SupersedingAssertion_targetItemId_idx";

-- DropTable
DROP TABLE IF EXISTS "SupersedingAssertion";
