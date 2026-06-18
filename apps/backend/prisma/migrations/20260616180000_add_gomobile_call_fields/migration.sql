-- AlterTable
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "gomobileJobId" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "gomobileCallStatus" TEXT;
