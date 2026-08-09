-- AlterTable
ALTER TABLE "GalleryItem" ADD COLUMN     "desktopMediaUrl" TEXT,
ADD COLUMN     "mobileMediaUrl" TEXT,
ADD COLUMN     "pageIndex" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sections" JSONB,
ADD COLUMN     "stackEvidence" JSONB,
ADD COLUMN     "strengths" JSONB;
