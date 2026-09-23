import { z } from "zod";

const externalTechnicianSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    company: z.string().trim().max(160).optional(),
    email: z.string().trim().email().max(254).optional(),
    phone: z.string().trim().max(40).optional(),
  })
  .strict();

const assignmentBase = z.object({
  version: z.number().int().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const faultAssignmentSchema = z
  .union([
    assignmentBase
      .extend({ assigneeType: z.literal("INTERNAL"), assigneeMemberId: z.string().uuid() })
      .strict(),
    assignmentBase
      .extend({
        assigneeType: z.literal("EXTERNAL"),
        externalTechnicianId: z.string().uuid().optional(),
        externalTechnician: externalTechnicianSchema.optional(),
      })
      .strict(),
  ])
  .superRefine((input, context) => {
    if (input.assigneeType === "EXTERNAL") {
      if (!input.externalTechnicianId && !input.externalTechnician)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalTechnician"],
          message: "Provide an existing or new external technician.",
        });
    }
  });

export type FaultAssignmentInput = z.infer<typeof faultAssignmentSchema>;
