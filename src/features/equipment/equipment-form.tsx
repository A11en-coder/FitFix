"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function EquipmentForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    assetId: "",
    name: "",
    category: "",
    location: "",
    description: "",
    currentStatus: "AVAILABLE",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/equipment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(body?.message ?? "Equipment could not be created.");
      setSaving(false);
      return;
    }
    router.push(`/equipment/${body.publicId}`);
  }

  return (
    <form aria-busy={saving} className="card equipment-form" onSubmit={submit}>
      <label>
        Asset ID
        <input
          value={form.assetId}
          onChange={(event) => setForm({ ...form, assetId: event.target.value })}
          required
          maxLength={50}
        />
      </label>
      <label>
        Name
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
          maxLength={120}
        />
      </label>
      <label>
        Category
        <input
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value })}
          required
          maxLength={80}
        />
      </label>
      <label>
        Location
        <input
          value={form.location}
          onChange={(event) => setForm({ ...form, location: event.target.value })}
          required
          maxLength={80}
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          maxLength={5000}
        />
      </label>
      {message ? (
        <p aria-live="assertive" role="alert">
          {message}
        </p>
      ) : null}
      <button className="button button--accent" disabled={saving} type="submit">
        {saving ? "Saving…" : "Create equipment"}
      </button>
    </form>
  );
}
