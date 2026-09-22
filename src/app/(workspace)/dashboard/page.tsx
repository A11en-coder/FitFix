import { currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  const name = user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? "there";

  return (
    <main>
      <p className="eyebrow">Workspace</p>
      <h1>Welcome, {name}.</h1>
      <p className="lede">Your gym workspace is ready for equipment, faults and team workflows.</p>
      <p>
        <a className="button button--accent" href="/onboarding">
          Review gym setup
        </a>
      </p>
    </main>
  );
}
