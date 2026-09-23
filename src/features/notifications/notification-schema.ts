import { z } from "zod";

export const notificationListSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().uuid().optional(),
  })
  .strict();

export const notificationReadSchema = z
  .object({ notificationId: z.string().uuid().optional(), markAll: z.boolean().optional() })
  .strict()
  .refine((input) => Boolean(input.notificationId) !== Boolean(input.markAll), {
    message: "Provide notificationId or markAll.",
  });

export type NotificationListInput = z.infer<typeof notificationListSchema>;
export type NotificationReadInput = z.infer<typeof notificationReadSchema>;
