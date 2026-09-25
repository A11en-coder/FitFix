import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "../../../features/auth/onboarding-form";
import { findActiveMembership } from "../../../features/auth/staff-service";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId } = await auth.protect();
  const membership = await findActiveMembership(userId);

  if (membership) {
    redirect("/dashboard");
  }

  const user = await currentUser();

  return (
    <main>
      <p className="eyebrow">Gym setup</p>
      <h1>Create your workspace.</h1>
      <p className="lede">
        Start with the gym details. Equipment and staff invitations can be added after the workspace
        is ready.
      </p>
      <OnboardingForm defaultName={user?.firstName ? `${user.firstName}'s gym` : ""} />
    </main>
  );
}
