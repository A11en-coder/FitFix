import { z } from "zod";
import { faultSeveritySchema } from "./draft-schema.ts";

const reviewEquipmentStatusSchema = z.enum(["AVAILABLE", "LIMITED", "OUT_OF_SERVICE"]);

export const faultReviewSchema = z
  .object({
    severity: faultSeveritySchema,
    equipmentStatus: reviewEquipmentStatusSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const faultListQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    status: z
      .enum(["REPORTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"])
      .optional(),
    severity: faultSeveritySchema.optional(),
    equipmentPublicId: z.string().trim().min(1).max(26).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().uuid().optional(),
  })
  .strict();

export type FaultReviewInput = z.infer<typeof faultReviewSchema>;
export type FaultListQueryInput = z.infer<typeof faultListQuerySchema>;
