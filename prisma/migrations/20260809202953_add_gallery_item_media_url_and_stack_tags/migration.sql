-- AlterTable
ALTER TABLE "GalleryItem" ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "stackTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
