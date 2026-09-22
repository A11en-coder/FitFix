import { currentUser } from "@clerk/nextjs/server";
import { OnboardingForm } from "../../../features/auth/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
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
