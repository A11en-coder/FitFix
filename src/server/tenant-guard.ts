// sets up a tenant guard for the application, which ensures that requests are only allowed to access resources that belong to the tenant associated with the request

export type Principal = Readonly<{ clerkUserId: string }>;
export type TenantMembership = Readonly<{ gymId: string; status: "ACTIVE" }>;
export type TenantContext = Readonly<{ gymId: string; clerkUserId: string }>;


export class TenantGuardError extends Error {
  public readonly code = "TENANT_ACCESS_DENIED" as const;

  public constructor() {
    super("Resource not found.");
    this.name = "TenantGuardError";
  }
}

type MembershipLookup = (clerkUserId: string) => Promise<TenantMembership | null>;

// If there is no authenticated identity, the request cannot be assigned to a gym.
export async function resolveTenantContext(
  principal: Principal | null,
  lookupMembership: MembershipLookup
): Promise<TenantContext> {
  if (!principal?.clerkUserId) throw new TenantGuardError();

  // If the user is not a member of any gym, or if their membership is not active, they cannot access any gym resources.
  const membership = await lookupMembership(principal.clerkUserId);
  if (!membership || membership.status !== "ACTIVE")
    throw new TenantGuardError();

  // After this point, the domain service has a trusted tenant boundary.
  return { gymId: membership.gymId, clerkUserId: principal.clerkUserId };
}

// If the resource's gymId does not match the tenant context's gymId, the request cannot access the resource.
export function assertTenantResource(context: TenantContext, resourceGymId: string): void {
  if (context.gymId !== resourceGymId) throw new TenantGuardError();
}
