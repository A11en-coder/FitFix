import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="auth-shell"><p>Authentication is not configured. Add Clerk keys to the environment before creating a workspace.</p></main>;
  }

  return <main className="auth-shell"><SignUp /></main>;
}
