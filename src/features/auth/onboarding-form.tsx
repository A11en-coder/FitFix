"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/gyms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message ?? "We could not create the gym workspace.");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="card onboarding-form" onSubmit={submit}>
      <label>
        Gym name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
        />
      </label>
      <label>
        Workspace slug
        <input
          value={slug}
          onChange={(event) => setSlug(event.target.value.toLowerCase())}
          placeholder="northside-fitness"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
          maxLength={80}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button className="button button--accent" disabled={submitting}>
        {submitting ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
