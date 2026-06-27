-- AlterTable
ALTER TABLE "campaign_messages" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "campaign_messages" DROP COLUMN IF EXISTS "contactName";

ALTER TABLE "campaign_messages" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "campaign_messages" ADD COLUMN "phone" TEXT;
ALTER TABLE "campaign_messages" ADD COLUMN "contactName" TEXT;
