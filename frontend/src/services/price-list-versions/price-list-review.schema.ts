import { z } from "zod";
import { PriceListVersionSchema, ReviewStatusSchema } from "./price-list-version.schema";
export const AuditActionSchema = z.enum([
  "PRICE_LIST_VERSION_APPROVED",
  "PRICE_LIST_VERSION_REJECTED",
]);

export const CreatePriceListVersionInputSchema = z
  .object({
    expectedPreviousVersionId: z.uuid().nullable(),
    confirmCreate: z.literal(true),
  })
  .strict();

export const ApprovalInputSchema = z
  .object({
    expectedCurrentVersionId: z.uuid().nullable(),
    confirmApproval: z.literal(true),
    decisionNote: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export const RejectionInputSchema = z
  .object({
    confirmRejection: z.literal(true),
    reason: z.string().trim().min(1, "دلیل رد را وارد کنید.").max(500),
  })
  .strict();

export const PriceListVersionReviewSchema = z
  .object({
    version_id: z.uuid(),
    status: ReviewStatusSchema,
    decided_by_user_id: z.uuid().nullable(),
    decided_by_email: z.email().nullable(),
    decided_at: z.iso.datetime({ offset: true }).nullable(),
    decision_note: z.string().nullable(),
  })
  .strict()
  .transform(
    ({
      version_id,
      decided_by_user_id,
      decided_by_email,
      decided_at,
      decision_note,
      ...review
    }) => ({
      ...review,
      versionId: version_id,
      decidedByUserId: decided_by_user_id,
      decidedByEmail: decided_by_email,
      decidedAt: decided_at,
      decisionNote: decision_note,
    }),
  );

export const ApprovalResultSchema = z
  .object({
    review: PriceListVersionReviewSchema,
    previous_current_version_id: z.uuid().nullable(),
    current_version_id: z.uuid().nullable(),
  })
  .strict()
  .transform(({ previous_current_version_id, current_version_id, ...result }) => ({
    ...result,
    previousCurrentVersionId: previous_current_version_id,
    currentVersionId: current_version_id,
  }));

export const CurrentPriceListVersionResponseSchema = z
  .object({ current_version: PriceListVersionSchema.nullable() })
  .strict()
  .transform(({ current_version }) => ({ currentVersion: current_version }));

export const PriceListAuditEventSchema = z
  .object({
    id: z.uuid(),
    actor_user_id: z.uuid(),
    actor_email: z.email(),
    action: AuditActionSchema,
    entity_type: z.literal("PRICE_LIST_VERSION"),
    entity_id: z.uuid(),
    occurred_at: z.iso.datetime({ offset: true }),
    details: z.record(z.string(), z.unknown()),
  })
  .strict()
  .transform(({ actor_user_id, actor_email, entity_type, entity_id, occurred_at, ...event }) => ({
    ...event,
    actorUserId: actor_user_id,
    actorEmail: actor_email,
    entityType: entity_type,
    entityId: entity_id,
    occurredAt: occurred_at,
  }));

export const PriceListAuditEventListSchema = z
  .object({
    items: z.array(PriceListAuditEventSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict();

export const AuditPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export type CreatePriceListVersionInput = z.input<typeof CreatePriceListVersionInputSchema>;
export type ApprovalInput = z.input<typeof ApprovalInputSchema>;
export type RejectionInput = z.input<typeof RejectionInputSchema>;
export type ApprovalResult = z.output<typeof ApprovalResultSchema>;
export type CurrentPriceListVersionResponse = z.output<
  typeof CurrentPriceListVersionResponseSchema
>;
export type PriceListAuditEvent = z.output<typeof PriceListAuditEventSchema>;
export type PriceListAuditEventList = z.output<typeof PriceListAuditEventListSchema>;
export type AuditPagination = z.input<typeof AuditPaginationSchema>;
