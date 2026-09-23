import { z } from "zod";
import { faultSeveritySchema } from "./draft-schema.ts";

// define the schema for equipment status
const equipmentStatusSchema = z.enum(["AVAILABLE", "LIMITED", "OUT_OF_SERVICE"]);

// define the schema for fault submission
export const faultSubmissionSchema = z
  .object({
    draftId: z.string().uuid().optional(),
    equipmentPublicId: z.string().trim().min(1).max(26),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(10000),
    severity: faultSeveritySchema,
    equipmentStatus: equipmentStatusSchema,
    discoveredAt: z.coerce
      .date()
      .refine(
        (date) => date.getTime() <= Date.now() + 5 * 60 * 1000,
        "Discovery time is too far in the future.",
      ),
    immediateAction: z.string().trim().max(5000).nullable().optional(),
    mediaAssetIds: z.array(z.string().uuid()).max(5).default([]),
    version: z.number().int().positive().optional(),
  })
  .strict();

export type FaultSubmissionInput = z.infer<typeof faultSubmissionSchema>;
