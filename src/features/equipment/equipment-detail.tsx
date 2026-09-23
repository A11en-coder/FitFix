"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Equipment = {
  id: string;
  publicId: string;
  assetId: string;
  name: string;
  category: string;
  location: string;
  description: string | null;
  currentStatus: string;
  version: number;
  archivedAt: string | null;
  statusIntervals: Array<{
    status: string;
    startedAt: string;
    endedAt: string | null;
    sourceFaultId: string | null;
  }>;
  faults: Array<{
    reference: string;
    title: string;
    severity: string;
    status: string;
    repairCost: string | null;
    resolvedAt: string | null;
    closedAt: string | null;
    createdAt: string;
  }>;
  historySummary: {
    faultCount: number;
    activeFaultCount: number;
    totalDowntimeSeconds: number;
    totalRepairCost: string;
  };
};

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return (
    [days ? `${days}d` : null, hours ? `${hours}h` : null, minutes ? `${minutes}m` : null]
      .filter(Boolean)
      .join(" ") || "0m"
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Present";
}

export function EquipmentDetail({ publicId }: { publicId: string }) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/equipment/${publicId}`)
      .then(async (response) => {
        const body = await response.json();
        if (response.ok) {
          setEquipment(body.equipment);
          setCanManage(body.canManage);
        } else setMessage(body.message ?? "Equipment could not be loaded.");
      })
      .catch(() => setMessage("Equipment could not be loaded. Check your connection and retry."))
      .finally(() => setLoading(false));
  }, [publicId]);

  if (message) return <p role="alert">{message}</p>;
  if (loading || !equipment) return <p role="status">Loading equipment…</p>;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!equipment) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/equipment/${publicId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: equipment.version,
        assetId: form.get("assetId"),
        name: form.get("name"),
        category: form.get("category"),
        location: form.get("location"),
        currentStatus: form.get("currentStatus"),
        description: form.get("description"),
      }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok) {
      setEquipment(body.equipment);
      setMessage("Equipment updated.");
    } else {
      setMessage(body?.message ?? "Equipment could not be updated.");
    }
    setSaving(false);
  }

  return (
    <article aria-busy={saving} className="card">
      <p className="eyebrow">{equipment.assetId}</p>
      <h2>{equipment.name}</h2>
      <p>
        {equipment.category} · {equipment.location}
      </p>
      <p>Status: {equipment.currentStatus}</p>
      {equipment.description ? <p>{equipment.description}</p> : null}
      <div className="grid">
        <section className="card">
          <h2>History summary</h2>
          <p>Total faults: {equipment.historySummary.faultCount}</p>
          <p>Active faults: {equipment.historySummary.activeFaultCount}</p>
          <p>
            Out-of-service time: {formatDuration(equipment.historySummary.totalDowntimeSeconds)}
          </p>
          <p>Total repair cost: {equipment.historySummary.totalRepairCost}</p>
        </section>
        <section className="card">
          <h2>Status history</h2>
          {equipment.statusIntervals.map((interval) => (
            <p key={`${interval.startedAt}-${interval.status}`}>
              {interval.status}: {formatDate(interval.startedAt)} – {formatDate(interval.endedAt)}
            </p>
          ))}
        </section>
      </div>
      {canManage && !equipment.archivedAt ? (
        <form className="stack-form" onSubmit={save}>
          <label>
            Asset ID
            <input name="assetId" defaultValue={equipment.assetId} required maxLength={50} />
          </label>
          <label>
            Name
            <input
              name="name"
              defaultValue={equipment.name}
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Category
            <input name="category" defaultValue={equipment.category} required maxLength={80} />
          </label>
          <label>
            Location
            <input name="location" defaultValue={equipment.location} required maxLength={80} />
          </label>
          <label>
            Status
            <select name="currentStatus" defaultValue={equipment.currentStatus}>
              <option value="AVAILABLE">Available</option>
              <option value="LIMITED">Limited</option>
              <option value="OUT_OF_SERVICE">Out of service</option>
            </select>
          </label>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={equipment.description ?? ""}
              maxLength={5000}
            />
          </label>
          <button className="button" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      ) : null}
      {message ? (
        <p aria-live="polite" role="status">
          {message}
        </p>
      ) : null}
      {canManage && !equipment.archivedAt ? (
        <p>
          <a className="button" href={`/api/equipment/${equipment.publicId}/qr`} download>
            Download QR code
          </a>
        </p>
      ) : null}
      {!equipment.archivedAt ? (
        <p>
          <a className="button" href={`/faults/new?equipmentPublicId=${equipment.publicId}`}>
            Report a fault
          </a>
        </p>
      ) : null}
      <section className="card">
        <h2>Fault history</h2>
        {equipment.faults.length ? (
          equipment.faults.map((fault) => (
            <article key={fault.reference}>
              <p className="eyebrow">{fault.reference}</p>
              <h3>{fault.title}</h3>
              <p>
                {fault.severity} · {fault.status} · Reported {formatDate(fault.createdAt)}
              </p>
              <p>Repair cost: {fault.repairCost ?? "Not recorded"}</p>
              <a href={`/faults/${fault.reference}`}>Open fault report</a>
            </article>
          ))
        ) : (
          <p>No fault history recorded.</p>
        )}
      </section>
    </article>
  );
}
