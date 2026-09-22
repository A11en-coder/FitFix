import { z } from "zod";

export const faultSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const draftEquipmentStatusSchema = z.enum(["AVAILABLE", "LIMITED", "OUT_OF_SERVICE"]);

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

export const faultDraftCreateSchema = z
  .object({
    equipmentPublicId: z.string().trim().min(1).max(26).nullable().optional(),
    title: nullableText(160),
    description: nullableText(10000),
    severity: faultSeveritySchema.nullable().optional(),
    equipmentStatus: draftEquipmentStatusSchema.nullable().optional(),
    immediateAction: nullableText(5000),
    discoveredAt: z.coerce.date().nullable().optional(),
  })
  .strict();

export const faultDraftUpdateSchema = faultDraftCreateSchema
  .extend({ version: z.number().int().positive() })
  .strict();

export const mediaRegistrationSchema = z
  .object({
    cloudinaryPublicId: z.string().trim().min(1).max(255),
    secureUrl: z.string().url().max(2048),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    bytes: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    width: z.number().int().positive().max(10000),
    height: z.number().int().positive().max(10000),
  })
  .strict();

export const uploadSignatureSchema = z
  .object({
    draftId: z.string().uuid(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    bytes: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
  })
  .strict();

export type FaultDraftCreateInput = z.infer<typeof faultDraftCreateSchema>;
export type FaultDraftUpdateInput = z.infer<typeof faultDraftUpdateSchema>;
export type MediaRegistrationInput = z.infer<typeof mediaRegistrationSchema>;
export type UploadSignatureInput = z.infer<typeof uploadSignatureSchema>;
