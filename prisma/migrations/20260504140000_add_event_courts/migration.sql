CREATE TABLE "ClubEventCourt" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,

    CONSTRAINT "ClubEventCourt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubEventCourt_eventId_courtId_key" ON "ClubEventCourt"("eventId", "courtId");
CREATE INDEX "ClubEventCourt_courtId_idx" ON "ClubEventCourt"("courtId");
CREATE INDEX "ClubEventCourt_eventId_idx" ON "ClubEventCourt"("eventId");

ALTER TABLE "ClubEventCourt" ADD CONSTRAINT "ClubEventCourt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventCourt" ADD CONSTRAINT "ClubEventCourt_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
