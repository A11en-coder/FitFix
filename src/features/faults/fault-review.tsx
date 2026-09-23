"use client";

/* Evidence URLs are signed Cloudinary URLs and are intentionally rendered as supplied by the media service. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Fault = {
  reference: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  triageState: string;
  reportedEquipmentStatus: string;
  immediateAction: string | null;
  reporterName: string;
  version: number;
  equipment: {
    publicId: string;
    assetId: string;
    name: string;
    location: string;
    currentStatus: string;
  };
  mediaAssets: { id: string; secureUrl: string }[];
  updates: { id: string; body: string; authorName: string }[];
  permittedActions: string[];
};

export function FaultReview({ reference }: { reference: string }) {
  const [fault, setFault] = useState<Fault | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/faults/${reference}`).then(async (response) => {
      const body = await response.json();
      if (response.ok) setFault(body.fault);
      else setMessage(body.message ?? "Fault could not be loaded.");
    });
  }, [reference]);

  if (message) return <p role="alert">{message}</p>;
  if (!fault) return <p>Loading fault…</p>;

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentFault = fault;
    if (!currentFault) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/faults/${reference}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        severity: form.get("severity"),
        equipmentStatus: form.get("equipmentStatus"),
        version: currentFault.version,
      }),
    });
    const body = await response.json();
    if (response.ok) setFault(body.fault);
    else setMessage(body.message ?? "Fault could not be reviewed.");
    setSaving(false);
  }

  return (
    <article>
      <p className="eyebrow">
        {fault.reference} · {fault.triageState}
      </p>
      <h1>{fault.title}</h1>
      <p className="lede">{fault.description}</p>
      <div className="grid">
        <section className="card">
          <h2>Report</h2>
          <p>Reported by {fault.reporterName}</p>
          <p>Severity: {fault.severity}</p>
          <p>Equipment status reported: {fault.reportedEquipmentStatus}</p>
          {fault.immediateAction ? <p>Immediate action: {fault.immediateAction}</p> : null}
        </section>
        <section className="card">
          <h2>Equipment</h2>
          <p>
            {fault.equipment.name} · {fault.equipment.assetId}
          </p>
          <p>{fault.equipment.location}</p>
          <p>Current status: {fault.equipment.currentStatus}</p>
          <Link href={`/equipment/${fault.equipment.publicId}`}>Open equipment</Link>
        </section>
      </div>
      {fault.mediaAssets.length ? (
        <div className="media-grid">
          {fault.mediaAssets.map((media) => (
            <img
              key={media.id}
              src={media.secureUrl}
              alt="Fault evidence"
              width={180}
              height={140}
            />
          ))}
        </div>
      ) : null}
      {fault.permittedActions.includes("REVIEW") ? (
        <form className="equipment-form" onSubmit={review}>
          <h2>Manager review</h2>
          <label>
            Severity
            <select name="severity" defaultValue={fault.severity}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
          <label>
            Equipment status
            <select name="equipmentStatus" defaultValue={fault.equipment.currentStatus}>
              <option value="AVAILABLE">Available</option>
              <option value="LIMITED">Limited</option>
              <option value="OUT_OF_SERVICE">Out of service</option>
            </select>
          </label>
          <button className="button button--accent" disabled={saving} type="submit">
            {saving ? "Saving…" : "Mark reviewed"}
          </button>
        </form>
      ) : null}
      <section className="card">
        <h2>Timeline</h2>
        {fault.updates.map((update) => (
          <p key={update.id}>
            <strong>{update.authorName}</strong> · {update.body}
          </p>
        ))}
      </section>
      {message ? <p role="status">{message}</p> : null}
    </article>
  );
}
