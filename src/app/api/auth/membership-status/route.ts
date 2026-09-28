import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { findActiveMembership } from "../../../../features/auth/staff-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { active: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );

  const membership = await findActiveMembership(userId);
  return NextResponse.json(
    { active: Boolean(membership) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
