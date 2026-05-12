UPDATE "Booking"
SET "status" = 'completed'
WHERE "status" = 'no_show';

ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";

CREATE TYPE "BookingStatus" AS ENUM (
  'pending_payment',
  'confirmed',
  'cancelled',
  'completed'
);

ALTER TABLE "Booking"
  ALTER COLUMN "status" TYPE "BookingStatus"
  USING "status"::text::"BookingStatus";

DROP TYPE "BookingStatus_old";
