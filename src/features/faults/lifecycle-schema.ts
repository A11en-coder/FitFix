import { z } from "zod";

const version = z.number().int().positive();
const equipmentStatus = z.enum(["AVAILABLE", "LIMITED", "OUT_OF_SERVICE"]);

export const faultStartSchema = z.object({ version }).strict();

export const faultUpdateSchema = z
  .object({ version, body: z.string().trim().min(1).max(5000) })
  .strict();

export const faultResolveSchema = z
  .object({ version, resolutionSummary: z.string().trim().min(1).max(5000) })
  .strict();

export const faultCloseSchema = z
  .object({
    version,
    repairCost: z.coerce.number().finite().min(0).max(999999999.99).optional(),
    equipmentStatus: equipmentStatus.optional(),
  })
  .strict();

export const faultReopenSchema = z
  .object({ version, reason: z.string().trim().min(1).max(5000) })
  .strict();

export type FaultStartInput = z.infer<typeof faultStartSchema>;
export type FaultUpdateInput = z.infer<typeof faultUpdateSchema>;
export type FaultResolveInput = z.infer<typeof faultResolveSchema>;
export type FaultCloseInput = z.infer<typeof faultCloseSchema>;
export type FaultReopenInput = z.infer<typeof faultReopenSchema>;
