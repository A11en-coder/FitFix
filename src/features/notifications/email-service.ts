import { Resend } from "resend";

type OutboxPayload = { reference?: string; title?: string; body?: string; destination?: string };

export class EmailConfigurationError extends Error {
  constructor() {
    super("Email delivery is not configured.");
    this.name = "EmailConfigurationError";
  }
}

export async function sendOutboxEmail(row: {
  recipientEmail: string;
  templateKey: string;
  payload: unknown;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new EmailConfigurationError();
  const payload = (row.payload ?? {}) as OutboxPayload;
  if (row.templateKey !== "fault-event") throw new Error("Unsupported email template.");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: [row.recipientEmail],
    subject: payload.title ?? "FitFix notification",
    text: `${payload.body ?? "You have a new FitFix notification."}\n\n${payload.destination ?? ""}`,
  });
  if (result.error) throw new Error("RESEND_SEND_FAILED");
  return result.data?.id ?? null;
}
