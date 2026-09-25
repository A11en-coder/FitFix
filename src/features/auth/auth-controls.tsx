"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

export function AuthControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <>
        <Link className="button" href="/sign-in">
          Log in
        </Link>
        <Link className="button button--accent" href="/sign-up">
          Create workspace
        </Link>
      </>
    );
  }

  return <ConfiguredAuthControls />;
}

function ConfiguredAuthControls() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <>
        <SignInButton mode="modal">
          <button className="button" type="button">
            Log in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="button button--accent" type="button">
            Create workspace
          </button>
        </SignUpButton>
      </>
    );
  }

  return (
    <>
      <Link className="button button--accent" href="/dashboard">
        Open workspace
      </Link>
      <UserButton />
    </>
  );
}
