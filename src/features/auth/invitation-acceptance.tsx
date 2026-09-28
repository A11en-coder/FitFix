"use client";

import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { waitForActiveMembership } from "./membership-readiness";

function clerkErrorMessage(error: unknown) {
  if (isClerkAPIResponseError(error)) return error.errors[0]?.longMessage ?? error.message;
  return error instanceof Error ? error.message : "The invitation could not be accepted.";
}

export function InvitationAcceptance() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const signInTicketStarted = useRef(false);

  const checkActiveMembership = useCallback(async () => {
    const response = await fetch("/api/auth/membership-status", { cache: "no-store" });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return (
      typeof result === "object" && result !== null && "active" in result && result.active === true
    );
  }, []);

  const continueWhenMembershipIsReady = useCallback(async () => {
    const ready = await waitForActiveMembership(checkActiveMembership);
    if (ready) {
      router.replace("/dashboard");
      return;
    }

    setError(
      "Your invitation was accepted, but FitFix is still syncing your workspace access. Check again in a moment.",
    );
  }, [checkActiveMembership, router]);

  async function retryWorkspaceNavigation() {
    setError(null);
    setIsSubmitting(true);
    try {
      await continueWhenMembershipIsReady();
    } finally {
      setIsSubmitting(false);
    }
  }

  const ticket = searchParams.get("__clerk_ticket");
  const status = searchParams.get("__clerk_status");

  useEffect(() => {
    if (
      !ticket ||
      status !== "sign_in" ||
      !isSignInLoaded ||
      isSubmitting ||
      signInTicketStarted.current
    )
      return;

    signInTicketStarted.current = true;
    setIsSubmitting(true);
    void signIn
      .create({ strategy: "ticket", ticket })
      .then(async (result) => {
        if (result.status !== "complete" || !result.createdSessionId) {
          throw new Error(
            "Clerk requires another sign-in step before this invitation can be accepted.",
          );
        }
        await setSignInActive({ session: result.createdSessionId });
        setInvitationAccepted(true);
        await continueWhenMembershipIsReady();
      })
      .catch((acceptanceError: unknown) => {
        setError(clerkErrorMessage(acceptanceError));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [
    continueWhenMembershipIsReady,
    isSignInLoaded,
    isSubmitting,
    setSignInActive,
    signIn,
    status,
    ticket,
  ]);

  async function acceptAsNewUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || !isSignUpLoaded) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signUp.create({
        strategy: "ticket",
        ticket,
        firstName,
        lastName,
        password,
      });
      if (result.status !== "complete" || !result.createdSessionId) {
        throw new Error(
          "Clerk requires another verification step before this invitation can be accepted.",
        );
      }
      await setSignUpActive({ session: result.createdSessionId });
      setInvitationAccepted(true);
      await continueWhenMembershipIsReady();
    } catch (acceptanceError) {
      setError(clerkErrorMessage(acceptanceError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!ticket) {
    return (
      <main className="auth-shell">
        <section className="card">
          <h1>Invitation link is incomplete</h1>
          <p>Ask the gym manager to send the invitation again.</p>
        </section>
      </main>
    );
  }

  if (status === "sign_in" || invitationAccepted) {
    return (
      <main className="auth-shell">
        <section className="card">
          <h1>{invitationAccepted ? "Joining your gym" : "Accepting invitation"}</h1>
          <p>
            {error ??
              (invitationAccepted
                ? "Your invitation is accepted. Waiting for workspace access to finish syncing…"
                : "Signing you in and joining the gym…")}
          </p>
          {invitationAccepted && !isSubmitting ? (
            <button
              className="button"
              onClick={() => void retryWorkspaceNavigation()}
              type="button"
            >
              Check workspace access
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  if (status === "complete") {
    return (
      <main className="auth-shell">
        <section className="card">
          <h1>Invitation accepted</h1>
          <p>Continue to FitFix to view your gym workspace.</p>
          <button
            className="button"
            disabled={isSubmitting}
            onClick={() => void retryWorkspaceNavigation()}
            type="button"
          >
            {isSubmitting ? "Checking workspace…" : "Continue"}
          </button>
          {error ? <p role="alert">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="card">
        <h1>Join your gym</h1>
        <p>Finish setting up your FitFix account to accept this invitation.</p>
        <form className="onboarding-form" onSubmit={acceptAsNewUser}>
          <label>
            First name
            <input
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label>
            Last name
            <input
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button className="button" disabled={isSubmitting || !isSignUpLoaded} type="submit">
            {isSubmitting ? "Joining…" : "Accept invitation"}
          </button>
        </form>
      </section>
    </main>
  );
}
