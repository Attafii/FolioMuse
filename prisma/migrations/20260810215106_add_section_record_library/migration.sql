-- CreateTable
CREATE TABLE "SectionRecord" (
    "id" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desktopCropUrl" TEXT,
    "mobileCropUrl" TEXT,
    "lessons" JSONB,
    "doNotCopyNote" TEXT,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionRecord_sectionType_idx" ON "SectionRecord"("sectionType");

-- CreateIndex
CREATE INDEX "SectionRecord_itemId_idx" ON "SectionRecord"("itemId");

-- AddForeignKey
ALTER TABLE "SectionRecord" ADD CONSTRAINT "SectionRecord_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
