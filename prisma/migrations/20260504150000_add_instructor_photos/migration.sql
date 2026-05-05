CREATE TABLE "InstructorPhoto" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstructorPhoto_instructorId_url_key" ON "InstructorPhoto"("instructorId", "url");
CREATE INDEX "InstructorPhoto_instructorId_sortOrder_idx" ON "InstructorPhoto"("instructorId", "sortOrder");

ALTER TABLE "InstructorPhoto"
ADD CONSTRAINT "InstructorPhoto_instructorId_fkey"
FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
