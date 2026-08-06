-- Migration: superseding_assertion (ADR-0003 D5)
-- Additive: no destructive operations on existing objects.
-- Adds the SupersedingAssertion table so attribution corrections can be
-- recorded as immutable superseding assertions (R3) with audit linkage.

-- CreateTable
CREATE TABLE "SupersedingAssertion" (
    "id" TEXT NOT NULL,
    "targetItemId" TEXT NOT NULL,
    "replacesAssertionId" TEXT NOT NULL,
    "correctedCreatorId" TEXT,
    "correctedLicenseType" TEXT,
    "rationale" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupersedingAssertion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (new-table indexes)
CREATE INDEX "SupersedingAssertion_targetItemId_idx" ON "SupersedingAssertion"("targetItemId");
CREATE INDEX "SupersedingAssertion_recordedAt_idx" ON "SupersedingAssertion"("recordedAt");

-- AddForeignKey (new table -> existing table; restrictive delete behavior)
ALTER TABLE "SupersedingAssertion" ADD CONSTRAINT "SupersedingAssertion_targetItemId_fkey" FOREIGN KEY ("targetItemId") REFERENCES "GalleryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
