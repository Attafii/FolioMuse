import { z } from "zod";

// ── Enum Schemas ────────────────────────────────────────────────────────

export const FlywheelEventTypeSchema = z.enum([
  "IMPRESSION",
  "OPEN",
  "SAVE",
  "COLLECTION_ADD",
  "MCP_RETRIEVAL_USE",
  "DISMISSAL",
  "REFORMULATION",
  "MODERATOR_ACCEPTANCE",
]);
export type FlywheelEventType = z.infer<typeof FlywheelEventTypeSchema>;

export const ExplanationReasonCodeSchema = z.enum([
  "QUALITY",
  "RECENT",
  "DIVERSITY",
  "SAVED_SIMILARITY",
  "PATTERN_FREQUENCY",
  "EXPERIMENT_ARM",
  "MODERATOR_APPROVED",
]);
export type ExplanationReasonCode = z.infer<typeof ExplanationReasonCodeSchema>;

export const ExperimentStatusSchema = z.enum([
  "DRAFT",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
]);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

// ── Shared Primitives ────────────────────────────────────────────────────

export const IsoDatetimeSchema = z
  .string()
  .datetime({ message: "must be an ISO 8601 datetime" });

// Hashed subject key: 64 lowercase hex chars (SHA-256), NO raw identifiers.
export const SubjectKeySchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, {
    message: "subjectKey must be a SHA-256 hex digest (64 lowercase hex chars)",
  });

// Event payload: flat primitives only. Nested objects are rejected — they
// could smuggle content blobs/URLs (ADR-0002 D7, ADR-0004 D7).
export const FlywheelEventPayloadSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);

// ── Event Schemas ────────────────────────────────────────────────────────

// Event types that target a gallery item (require itemId).
const ITEM_CENTRIC_EVENTS = new Set<FlywheelEventType>([
  "IMPRESSION",
  "OPEN",
  "SAVE",
  "COLLECTION_ADD",
  "DISMISSAL",
  "MODERATOR_ACCEPTANCE",
]);

export const NewFlywheelEventInputSchema = z
  .object({
    eventType: FlywheelEventTypeSchema,
    subjectKey: SubjectKeySchema,
    itemId: z.string().nullable().optional(),
    patternSignalId: z.string().nullable().optional(),
    experimentId: z.string().nullable().optional(),
    variant: z.string().nullable().optional(),
    occurredAt: IsoDatetimeSchema,
    idempotencyKey: z.string().min(1, "idempotencyKey must not be empty").max(200),
    payload: FlywheelEventPayloadSchema.optional(),
  })
  .strict()
  .superRefine((event, ctx) => {
    // MODERATOR_ACCEPTANCE requires itemId (fed from ReviewDecision status path).
    if (event.eventType === "MODERATOR_ACCEPTANCE" && !event.itemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itemId"],
        message: "MODERATOR_ACCEPTANCE events require an itemId",
      });
    }
    // Item-centric events require itemId.
    if (ITEM_CENTRIC_EVENTS.has(event.eventType) && !event.itemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itemId"],
        message: `${event.eventType} events require an itemId`,
      });
    }
    // Every event must reference at least one subject of behavior
    // (item and/or pattern signal) — an event attached to nothing is noise.
    if (!event.itemId && !event.patternSignalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["patternSignalId"],
        message: "an event must reference an itemId and/or patternSignalId",
      });
    }
  });

export const FlywheelEventSchema = z
  .object({
    id: z.string(),
    eventType: FlywheelEventTypeSchema,
    subjectKey: SubjectKeySchema,
    itemId: z.string().nullable(),
    patternSignalId: z.string().nullable(),
    experimentId: z.string().nullable(),
    variant: z.string().nullable(),
    occurredAt: IsoDatetimeSchema,
    idempotencyKey: z.string().min(1).max(200),
    payload: FlywheelEventPayloadSchema,
    createdAt: IsoDatetimeSchema,
  })
  .strict();

export const FlywheelEventFilterSchema = z
  .object({
    eventType: FlywheelEventTypeSchema.optional(),
    itemId: z.string().optional(),
    patternSignalId: z.string().optional(),
    subjectKey: SubjectKeySchema.optional(),
    since: IsoDatetimeSchema.optional(),
    until: IsoDatetimeSchema.optional(),
  })
  .strict();

// ── Ranking Schemas ──────────────────────────────────────────────────────

export const RankableItemSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable(),
    creatorId: z.string(),
    creatorName: z.string(),
    status: z.enum(["ACCEPTED", "REJECTED", "SUSPENDED", "PENDING_REVIEW"]),
    qualityScore: z.number().min(0).max(1),
    acceptedAt: IsoDatetimeSchema,
  })
  .strict();
export type RankableItem = z.infer<typeof RankableItemSchema>;

export const RankingParamsSchema = z
  .object({
    wQuality: z.number().min(0),
    wRecency: z.number().min(0),
    wUtility: z.number().min(0),
    saturationLambda: z.number().positive(),
    maxItemsPerCreator: z.number().int().positive(),
    topN: z.number().int().positive(),
  })
  .strict();
export type RankingParams = z.infer<typeof RankingParamsSchema>;

// Safe projection: NO content blob, NO raw captures, NO source URLs beyond
// canonical creator attribution (ADR-0001/0002, curation ProvenanceSummary
// philosophy).
export const RankingResultSchema = z
  .object({
    itemId: z.string(),
    title: z.string().nullable(),
    creatorId: z.string(),
    creatorName: z.string(),
    qualityScore: z.number().min(0).max(1),
    recencyScore: z.number(),
    utilityScore: z.number(),
    finalRankScore: z.number(),
    explanationReasonCode: ExplanationReasonCodeSchema,
  })
  .strict();
export type RankingResult = z.infer<typeof RankingResultSchema>;

export const RankingScoreRecordSchema = z
  .object({
    itemId: z.string(),
    rawScore: z.number(),
    decayedScore: z.number(),
    qualityScore: z.number().min(0).max(1),
    recencyScore: z.number(),
    finalRankScore: z.number(),
    lastComputedAt: IsoDatetimeSchema,
  })
  .strict();
export type RankingScoreRecord = z.infer<typeof RankingScoreRecordSchema>;

// ── Suggestion Strength Schemas ──────────────────────────────────────────

export const PatternSignalRecordSchema = z
  .object({
    id: z.string(),
    patternType: z.string().min(1).max(200),
    eligibleItemCount: z.number().int().min(0),
    distinctCreatorCount: z.number().int().min(0),
  })
  .strict();
export type PatternSignalRecord = z.infer<typeof PatternSignalRecordSchema>;

export const SuggestionParamsSchema = z
  .object({
    minEligibleItems: z.number().int().positive(),
    minDistinctCreators: z.number().int().positive(),
    maxUplift: z.number().min(0),
    maxSuggestionStrength: z.number().positive(),
  })
  .strict();
export type SuggestionParams = z.infer<typeof SuggestionParamsSchema>;

export const SignalScoreRecordSchema = z
  .object({
    patternSignalId: z.string(),
    suggestionStrength: z.number().min(0),
    explanationReasonCode: ExplanationReasonCodeSchema,
    lastComputedAt: IsoDatetimeSchema,
  })
  .strict();
export type SignalScoreRecord = z.infer<typeof SignalScoreRecordSchema>;

// ── Experiment Schemas ───────────────────────────────────────────────────

export const ExperimentVariantSchema = z
  .object({
    key: z.string().min(1).max(100),
    weight: z.number().min(0, "variant weight must be >= 0").max(1, "variant weight must be <= 1"),
  })
  .strict();
export type ExperimentVariant = z.infer<typeof ExperimentVariantSchema>;

export const ExperimentGuardrailsSchema = z
  .object({
    maxOriginalityDeviation: z.number().min(0).max(1),
    minDiversity: z.number().min(0).max(1),
    maxAttributionViolations: z.number().int().min(0),
  })
  .strict();
export type ExperimentGuardrails = z.infer<typeof ExperimentGuardrailsSchema>;

export const ExperimentConfigSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    variants: z
      .array(ExperimentVariantSchema)
      .min(2, "an experiment requires at least 2 variants")
      .max(10),
    guardrailConfig: ExperimentGuardrailsSchema,
  })
  .strict()
  .superRefine((config, ctx) => {
    // Variant keys must be unique.
    const keys = new Set(config.variants.map((v) => v.key));
    if (keys.size !== config.variants.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "variant keys must be unique",
      });
    }
    // Weights must sum to 1 (with small epsilon for float arithmetic).
    const sum = config.variants.reduce((acc, v) => acc + v.weight, 0);
    if (Math.abs(sum - 1) > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "variant weights must sum to 1",
      });
    }
    // All variants must have positive weight (a 0-weight variant is dead config).
    if (config.variants.some((v) => v.weight <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "every variant must have positive weight",
      });
    }
  });
export type ExperimentConfigInput = z.infer<typeof ExperimentConfigSchema>;

export const ExperimentRecordSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable(),
    status: ExperimentStatusSchema,
    variants: z.array(ExperimentVariantSchema),
    guardrailConfig: ExperimentGuardrailsSchema,
    startedAt: IsoDatetimeSchema.nullable(),
    endedAt: IsoDatetimeSchema.nullable(),
    createdAt: IsoDatetimeSchema,
  })
  .strict();
export type ExperimentRecord = z.infer<typeof ExperimentRecordSchema>;

export const ExperimentAssignmentRecordSchema = z
  .object({
    id: z.string(),
    experimentId: z.string(),
    subjectKey: SubjectKeySchema,
    variant: z.string().min(1).max(100),
    assignedAt: IsoDatetimeSchema,
  })
  .strict();
export type ExperimentAssignmentRecord = z.infer<typeof ExperimentAssignmentRecordSchema>;

export const GuardrailEvaluationSchema = z
  .object({
    experimentId: z.string(),
    recommendation: z.enum(["RUNNING", "PAUSED"]),
    breached: z.array(z.string()),
  })
  .strict();
export type GuardrailEvaluation = z.infer<typeof GuardrailEvaluationSchema>;

// ── Telemetry (privacy-minimized, ADR-0004 D7/D8) ────────────────────────

export const FlywheelTelemetryEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EVENT_INGESTED"),
    eventType: FlywheelEventTypeSchema,
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("EVENT_VALIDATION_FAILED"),
    reason: z.string().min(1),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("EVENT_DEDUPED"),
    idempotencyKey: z.string().min(1).max(200),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("RANKING_COMPUTED"),
    itemCount: z.number().int().min(0),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("RANKING_ELIGIBILITY_EXCLUDED"),
    itemCount: z.number().int().min(0),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("SUGGESTIONS_ADJUSTED"),
    signalCount: z.number().int().min(0),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("EXPERIMENT_REGISTERED"),
    experimentId: z.string(),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("EXPERIMENT_ASSIGNED"),
    experimentId: z.string(),
    variant: z.string().min(1).max(100),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("GUARDRAIL_BREACH"),
    experimentId: z.string(),
    breached: z.array(z.string()),
    timestamp: IsoDatetimeSchema,
  }).strict(),
]);
export type FlywheelTelemetryEvent = z.infer<typeof FlywheelTelemetryEventSchema>;
