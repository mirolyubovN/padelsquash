-- Create a new enum with expanded roles and migrate existing values.
CREATE TYPE "UserRole_new" AS ENUM ('customer', 'trainer', 'admin', 'super_admin');

ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE
      WHEN "role"::text = 'coach' THEN 'trainer'
      ELSE "role"::text
    END
  )::"UserRole_new";

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'customer';

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Link trainer users to instructor profiles.
ALTER TABLE "User"
  ADD COLUMN "instructorId" TEXT;

CREATE UNIQUE INDEX "User_instructorId_key" ON "User"("instructorId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
