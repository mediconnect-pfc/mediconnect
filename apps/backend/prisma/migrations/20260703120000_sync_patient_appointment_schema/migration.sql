DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PatientStatus') THEN
    CREATE TYPE "PatientStatus" AS ENUM ('ACTIF', 'PENDING', 'NO_SHOW');
  END IF;
END $$;

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "status" "PatientStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "portalTokenExpiry" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "patients"
SET
  "firstName" = COALESCE(NULLIF("firstName", ''), split_part("name", ' ', 1)),
  "lastName" = COALESCE(
    NULLIF("lastName", ''),
    NULLIF(trim(regexp_replace("name", '^\S+\s*', '')), ''),
    ''
  )
WHERE "name" IS NOT NULL;

UPDATE "patients" SET "firstName" = '' WHERE "firstName" IS NULL;
UPDATE "patients" SET "lastName" = '' WHERE "lastName" IS NULL;

ALTER TABLE "patients" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "patients" ALTER COLUMN "lastName" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "patients_email_key" ON "patients"("email");

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "portalToken" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "appointments_portalToken_key" ON "appointments"("portalToken");
