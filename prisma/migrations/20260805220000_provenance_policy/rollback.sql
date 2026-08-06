-- Rollback: provenance_policy (ADR-0003)
-- Drops ONLY new objects created by migration.sql, in reverse dependency order.
-- Existing curation tables/columns are untouched.

-- DropForeignKey (new table -> existing table)
ALTER TABLE "RemovalRecord" DROP CONSTRAINT IF EXISTS "RemovalRecord_itemId_fkey";
ALTER TABLE "OwnershipClaim" DROP CONSTRAINT IF EXISTS "OwnershipClaim_itemId_fkey";

-- DropForeignKey (existing table -> new table)
ALTER TABLE "GalleryItem" DROP CONSTRAINT IF EXISTS "GalleryItem_aiProvenanceId_fkey";
ALTER TABLE "GalleryItem" DROP CONSTRAINT IF EXISTS "GalleryItem_sourceRecordId_fkey";
ALTER TABLE "OwnershipClaim" DROP CONSTRAINT IF EXISTS "OwnershipClaim_creatorId_fkey";
ALTER TABLE "SourceRecord" DROP CONSTRAINT IF EXISTS "SourceRecord_creatorId_fkey";
ALTER TABLE "Attribution" DROP CONSTRAINT IF EXISTS "Attribution_creatorId_fkey";

-- DropIndex (new-table indexes)
DROP INDEX IF EXISTS "RemovalRecord_status_idx";
DROP INDEX IF EXISTS "RemovalRecord_itemId_status_idx";
DROP INDEX IF EXISTS "OwnershipClaim_itemId_idx";
DROP INDEX IF EXISTS "OwnershipClaim_status_idx";
DROP INDEX IF EXISTS "AiProvenance_disclosureStatus_idx";
DROP INDEX IF EXISTS "SourceRecord_captureMode_idx";
DROP INDEX IF EXISTS "SourceRecord_creatorId_idx";
DROP INDEX IF EXISTS "SourceRecord_canonicalUrl_key";

-- DropIndex (existing-table indexes added by this migration)
DROP INDEX IF EXISTS "PatternSignal_rebuildState_staleSince_idx";
DROP INDEX IF EXISTS "GalleryItem_creatorRole_idx";
DROP INDEX IF EXISTS "GalleryItem_status_idx";
DROP INDEX IF EXISTS "GalleryItem_sourceRecordId_key";
DROP INDEX IF EXISTS "GalleryItem_aiProvenanceId_key";
DROP INDEX IF EXISTS "Attribution_creatorId_idx";

-- AlterTable (drop added nullable columns, reverse order)
ALTER TABLE "PatternSignal" DROP COLUMN IF EXISTS "rebuildState";
ALTER TABLE "PatternSignal" DROP COLUMN IF EXISTS "distinctCreatorCount";
ALTER TABLE "PatternSignal" DROP COLUMN IF EXISTS "eligibleItemCount";
ALTER TABLE "GalleryItem" DROP COLUMN IF EXISTS "aiProvenanceId";
ALTER TABLE "GalleryItem" DROP COLUMN IF EXISTS "sourceRecordId";
ALTER TABLE "ConsentRecord" DROP COLUMN IF EXISTS "revokedAt";
ALTER TABLE "Attribution" DROP COLUMN IF EXISTS "creatorId";

-- DropTable (new tables, reverse dependency order)
DROP TABLE IF EXISTS "RemovalRecord";
DROP TABLE IF EXISTS "OwnershipClaim";
DROP TABLE IF EXISTS "AiProvenance";
DROP TABLE IF EXISTS "SourceRecord";
DROP TABLE IF EXISTS "Creator";
