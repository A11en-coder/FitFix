import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { findActiveMembership } from "../../features/auth/staff-service";
import { WorkspaceNavigation } from "../../features/navigation/workspace-navigation";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    throw new Error("Clerk authentication is not configured for the workspace.");
  }

  const { userId } = await auth.protect();
  const membership = await findActiveMembership(userId);

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <>
      <WorkspaceNavigation isManager={membership?.role === "MANAGER"} />
      <section className="workspace-shell" id="main-content">
        {children}
      </section>
    </>
  );
}
