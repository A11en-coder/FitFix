// this file defines the schemas for the equipment feature
import { z } from "zod";

const editableStatus = z.enum(["AVAILABLE", "LIMITED", "OUT_OF_SERVICE"]);

export const equipmentCreateSchema = z
  .object({
    assetId: z.string().trim().min(1).max(50),
    name: z.string().trim().min(2).max(120),
    category: z.string().trim().min(1).max(80),
    location: z.string().trim().min(1).max(80),
    description: z.string().trim().max(5000).optional(),
    currentStatus: editableStatus.default("AVAILABLE"),
  })
  .strict();

export const equipmentUpdateSchema = equipmentCreateSchema
  .partial()
  .extend({
    version: z.number().int().positive(),
  })
  .strict();
export const equipmentArchiveSchema = z
  .object({
    version: z.number().int().positive(),
  })
  .strict();

export const equipmentSearchSchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    category: z.string().trim().max(80).optional(),
    location: z.string().trim().max(80).optional(),
    status: z.enum(["AVAILABLE", "LIMITED", "OUT_OF_SERVICE", "ARCHIVED"]).optional(),
    includeArchived: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .default("false"),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().trim().min(1).optional(),
  })
  .strict();

export type EquipmentCreateInput = z.infer<typeof equipmentCreateSchema>;
export type EquipmentUpdateInput = z.infer<typeof equipmentUpdateSchema>;
export type EquipmentArchiveInput = z.infer<typeof equipmentArchiveSchema>;
export type EquipmentSearchInput = z.infer<typeof equipmentSearchSchema>;
