// defines the schema for staff invitation and role input
import { z } from "zod";

// StaffInvitationInput schema defines the structure and validation rules for inviting staff members. It requires an email address and a role (either "MANAGER" or "STAFF").
export const staffInvitationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    role: z.enum(["MANAGER", "STAFF"]).default("STAFF"),
  })
  .strict();

// StaffRoleInput schema defines the structure and validation rules for changing a staff member's role. It requires a role (either "MANAGER" or "STAFF").
export const staffRoleSchema = z
  .object({
    role: z.enum(["MANAGER", "STAFF"]),
  })
  .strict();

export type StaffInvitationInput = z.infer<typeof staffInvitationSchema>;
export type StaffRoleInput = z.infer<typeof staffRoleSchema>;
