import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="auth-shell"><p>Authentication is not configured. Add Clerk keys to the environment before signing in.</p></main>;
  }

  return <main className="auth-shell"><SignIn /></main>;
}
