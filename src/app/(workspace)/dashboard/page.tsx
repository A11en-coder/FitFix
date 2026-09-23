import { currentUser } from "@clerk/nextjs/server";
import { Dashboard } from "../../../features/dashboard/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  const name = user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? "there";

  return (
    <main>
      <p className="eyebrow">Workspace</p>
      <h1>Welcome, {name}.</h1>
      <p className="lede">Prioritize the maintenance work that needs attention today.</p>
      <Dashboard />
    </main>
  );
}
