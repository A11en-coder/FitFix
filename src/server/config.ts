// make sure that the environment variables are valid and have the correct types
import { z } from "zod";

const environmentSchema = z.object({
  APP_URL: z.string().url(),
  APP_ENV: z.enum(["development", "preview", "staging", "production"]),
  SUPPORT_EMAIL: z.string().email(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1)
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function getConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    throw new Error(`Invalid application configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  return result.data;
}
