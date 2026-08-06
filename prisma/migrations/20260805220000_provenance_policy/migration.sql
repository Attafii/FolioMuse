-- Migration: provenance_policy (ADR-0003)
-- Additive: no destructive operations on existing objects.
-- Adds provenance models + nullable rollout fields to existing tables.

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "captureMode" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "evidenceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatorId" TEXT,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProvenance" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "disclosureStatus" TEXT NOT NULL,
    "promptHash" TEXT,
    "outputHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiProvenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipClaim" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "claimantName" TEXT NOT NULL,
    "claimantContact" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatorId" TEXT,

    CONSTRAINT "OwnershipClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemovalRecord" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemovalRecord_pkey" PRIMARY KEY ("id")
);

-- AlterTable (additive, nullable): Attribution gains canonical creator link
ALTER TABLE "Attribution" ADD COLUMN "creatorId" TEXT;

-- AlterTable (additive, nullable): ConsentRecord gains revocation timestamp
ALTER TABLE "ConsentRecord" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- AlterTable (additive, nullable): GalleryItem gains provenance rollout relations
ALTER TABLE "GalleryItem" ADD COLUMN "sourceRecordId" TEXT;
ALTER TABLE "GalleryItem" ADD COLUMN "aiProvenanceId" TEXT;

-- AlterTable (additive, nullable): PatternSignal gains eligibility + rebuild state
ALTER TABLE "PatternSignal" ADD COLUMN "eligibleItemCount" INTEGER;
ALTER TABLE "PatternSignal" ADD COLUMN "distinctCreatorCount" INTEGER;
ALTER TABLE "PatternSignal" ADD COLUMN "rebuildState" TEXT;

-- CreateIndex (existing-table indexes)
CREATE INDEX "Attribution_creatorId_idx" ON "Attribution"("creatorId");
CREATE INDEX "GalleryItem_status_idx" ON "GalleryItem"("status");
CREATE INDEX "GalleryItem_creatorRole_idx" ON "GalleryItem"("creatorRole");
CREATE INDEX "PatternSignal_rebuildState_staleSince_idx" ON "PatternSignal"("rebuildState", "staleSince");

-- CreateIndex (unique rollout relations on GalleryItem)
CREATE UNIQUE INDEX "GalleryItem_sourceRecordId_key" ON "GalleryItem"("sourceRecordId");
CREATE UNIQUE INDEX "GalleryItem_aiProvenanceId_key" ON "GalleryItem"("aiProvenanceId");

-- CreateIndex (new-table indexes)
CREATE UNIQUE INDEX "SourceRecord_canonicalUrl_key" ON "SourceRecord"("canonicalUrl");
CREATE INDEX "SourceRecord_creatorId_idx" ON "SourceRecord"("creatorId");
CREATE INDEX "SourceRecord_captureMode_idx" ON "SourceRecord"("captureMode");
CREATE INDEX "AiProvenance_disclosureStatus_idx" ON "AiProvenance"("disclosureStatus");
CREATE INDEX "OwnershipClaim_status_idx" ON "OwnershipClaim"("status");
CREATE INDEX "OwnershipClaim_itemId_idx" ON "OwnershipClaim"("itemId");
CREATE INDEX "RemovalRecord_itemId_status_idx" ON "RemovalRecord"("itemId", "status");
CREATE INDEX "RemovalRecord_status_idx" ON "RemovalRecord"("status");

-- AddForeignKey (existing table -> new table; restrictive delete behavior)
ALTER TABLE "Attribution" ADD CONSTRAINT "Attribution_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnershipClaim" ADD CONSTRAINT "OwnershipClaim_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (existing table -> new table; GalleryItem provenance rollout)
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_aiProvenanceId_fkey" FOREIGN KEY ("aiProvenanceId") REFERENCES "AiProvenance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (new table -> existing table; restrictive delete behavior)
ALTER TABLE "OwnershipClaim" ADD CONSTRAINT "OwnershipClaim_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RemovalRecord" ADD CONSTRAINT "RemovalRecord_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
