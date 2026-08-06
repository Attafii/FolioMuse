-- Migration: flywheel_behavior_events (ADR-0004)
-- Additive: no destructive operations on existing objects.
-- Adds data flywheel models: BehaviorEvent, Experiment, ExperimentAssignment,
-- RankingScore, SignalScore. All new tables; existing tables gain back-relations
-- only (no column additions to GalleryItem/PatternSignal).

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "variants" JSONB NOT NULL,
    "guardrailConfig" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "itemId" TEXT,
    "patternSignalId" TEXT,
    "experimentId" TEXT,
    "variant" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingScore" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "decayedScore" DOUBLE PRECISION NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "recencyScore" DOUBLE PRECISION NOT NULL,
    "finalRankScore" DOUBLE PRECISION NOT NULL,
    "lastComputedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalScore" (
    "id" TEXT NOT NULL,
    "patternSignalId" TEXT NOT NULL,
    "suggestionStrength" DOUBLE PRECISION NOT NULL,
    "explanationReasonCode" TEXT NOT NULL,
    "lastComputedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_name_key" ON "Experiment"("name");
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");
CREATE UNIQUE INDEX "ExperimentAssignment_experimentId_subjectKey_key" ON "ExperimentAssignment"("experimentId", "subjectKey");
CREATE INDEX "ExperimentAssignment_experimentId_idx" ON "ExperimentAssignment"("experimentId");
CREATE UNIQUE INDEX "BehaviorEvent_idempotencyKey_key" ON "BehaviorEvent"("idempotencyKey");
CREATE INDEX "BehaviorEvent_itemId_idx" ON "BehaviorEvent"("itemId");
CREATE INDEX "BehaviorEvent_patternSignalId_idx" ON "BehaviorEvent"("patternSignalId");
CREATE INDEX "BehaviorEvent_experimentId_idx" ON "BehaviorEvent"("experimentId");
CREATE INDEX "BehaviorEvent_eventType_occurredAt_idx" ON "BehaviorEvent"("eventType", "occurredAt");
CREATE UNIQUE INDEX "RankingScore_itemId_key" ON "RankingScore"("itemId");
CREATE UNIQUE INDEX "SignalScore_patternSignalId_key" ON "SignalScore"("patternSignalId");

-- AddForeignKey
ALTER TABLE "ExperimentAssignment" ADD CONSTRAINT "ExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_patternSignalId_fkey" FOREIGN KEY ("patternSignalId") REFERENCES "PatternSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RankingScore" ADD CONSTRAINT "RankingScore_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GalleryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SignalScore" ADD CONSTRAINT "SignalScore_patternSignalId_fkey" FOREIGN KEY ("patternSignalId") REFERENCES "PatternSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
