// make sure that the environment variables are valid and have the correct types
import { z } from "zod";

const environmentSchema = z
  .object({
    APP_URL: z.string().url(),
    APP_ENV: z.enum(["development", "preview", "staging", "production"]),
    SUPPORT_EMAIL: z.string().email(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
    CLERK_SIGN_IN_URL: z.string().startsWith("/"),
    CLERK_SIGN_UP_URL: z.string().startsWith("/"),
    CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().startsWith("/"),
    CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().startsWith("/"),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    CLOUDINARY_UPLOAD_PRESET: z.string().min(1),
    INTERNAL_JOB_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
  })
  .superRefine((data, context) => {
    if (data.APP_ENV === "production" && !data.RESEND_API_KEY)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "Required in production.",
      });
    if (data.APP_ENV === "production" && !data.EMAIL_FROM)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_FROM"],
        message: "Required in production.",
      });
  });

export type AppConfig = z.infer<typeof environmentSchema>;

export function getConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    throw new Error(
      `Invalid application configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  }
  return result.data;
}
