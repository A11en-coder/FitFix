import { z } from "zod";

export const gymOnboardingSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80),
    timeZone: z.string().trim().min(1).max(64).default("Australia/Sydney"),
    currencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .default("AUD"),
  })
  .strict();

export type GymOnboardingInput = z.infer<typeof gymOnboardingSchema>;

export function parseGymOnboardingInput(value: unknown): GymOnboardingInput {
  return gymOnboardingSchema.parse(value);
}
