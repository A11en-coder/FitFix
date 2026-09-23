// this file converts Clerk webhook events into a more usable format for our application

import { z } from "zod";

const webhookEventSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.unknown()),
  object: z.literal("event"),
  event_attributes: z.record(z.unknown()).optional(),
});

export type ClerkWebhookEvent = z.infer<typeof webhookEventSchema>;

export function parseClerkWebhookEvent(value: unknown): ClerkWebhookEvent {
  return webhookEventSchema.parse(value);
}

export function mapClerkRole(role: unknown): "MANAGER" | "STAFF" {
  return role === "org:admin" || role === "admin" ? "MANAGER" : "STAFF";
}

export function mapClerkMembershipStatus(
  eventType: string,
  status: unknown,
): "ACTIVE" | "INVITED" | "DEACTIVATED" {
  if (eventType.endsWith(".deleted")) return "DEACTIVATED";
  if (eventType.endsWith(".created")) return "ACTIVE";
  return status === "active" || status === "accepted" ? "ACTIVE" : "INVITED";
}

export function displayNameFromClerkData(data: Record<string, unknown>): string {
  const publicUserData = asRecord(data.public_user_data);
  const firstName = stringValue(publicUserData.first_name);
  const lastName = stringValue(publicUserData.last_name);
  const identifier = stringValue(publicUserData.identifier) ?? "FitFix member";
  return [firstName, lastName].filter(Boolean).join(" ") || identifier;
}

export function emailFromClerkData(data: Record<string, unknown>): string {
  const publicUserData = asRecord(data.public_user_data);
  const emailAddresses = Array.isArray(publicUserData.email_addresses)
    ? publicUserData.email_addresses
    : [];
  const firstEmail = asRecord(emailAddresses[0]);
  return (
    stringValue(firstEmail.email_address) ??
    stringValue(publicUserData.identifier) ??
    "unknown@invalid.local"
  );
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
