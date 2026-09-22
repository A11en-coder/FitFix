import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    throw new Error("Clerk authentication is not configured for the workspace.");
  }

  await auth.protect();
  return <section className="workspace-shell">{children}</section>;
}
