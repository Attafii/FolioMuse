-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Attribution" (
    "id" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "consentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "consentedBy" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "terms" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creatorRole" TEXT NOT NULL,
    "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualityLevel" TEXT,
    "complianceStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "attributionId" TEXT NOT NULL,
    "consentRecordId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "duplicateOfId" TEXT,
    "structureFingerprint" TEXT,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "itemId" TEXT,
    "decision" TEXT,
    "rationale" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "qualityLevel" TEXT NOT NULL,
    "complianceStatus" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "rationale" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "appealedAt" TIMESTAMP(3),
    "appealDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternSignal" (
    "id" TEXT NOT NULL,
    "derivedFromItemIds" TEXT[],
    "patternType" TEXT NOT NULL,
    "staleSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatternSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attribution_sourceUrl_key" ON "Attribution"("sourceUrl");

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "Attribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "ConsentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
