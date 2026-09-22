// creates a page for managing staff members in a gym, including inviting new staff, reviewing their roles, and removing access when they leave the gym.
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { StaffManagement } from "../../../features/auth/staff-management";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <main>
      <p className="eyebrow">Access</p>
      <h1>Manage staff.</h1>
      <p className="lede">
        Invite teammates, review their roles, and remove access when they leave the gym.
      </p>
      <StaffManagement />
    </main>
  );
}
