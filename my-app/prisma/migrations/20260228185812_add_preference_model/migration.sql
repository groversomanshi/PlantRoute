-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripPace" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "crowdComfort" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "morningTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lateNightTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "walkingEffort" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "budgetLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "planningVsSpontaneity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "noiseSensitivity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "dislikeHeat" BOOLEAN NOT NULL DEFAULT false,
    "dislikeCold" BOOLEAN NOT NULL DEFAULT false,
    "dislikeRain" BOOLEAN NOT NULL DEFAULT false,
    "travelVibe" TEXT NOT NULL DEFAULT 'Chill',
    "additionalNotes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "preferencesSnapshot" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Preference_userId_key" ON "Preference"("userId");

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
