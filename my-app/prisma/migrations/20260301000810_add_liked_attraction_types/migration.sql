-- AlterTable
ALTER TABLE "Preference" ADD COLUMN     "likedAttractionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
