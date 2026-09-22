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
};

export function EquipmentDetail({ publicId }: { publicId: string }) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/equipment/${publicId}`).then(async (response) => {
      const body = await response.json();
      if (response.ok) {
        setEquipment(body.equipment);
        setCanManage(body.canManage);
      } else setMessage(body.message ?? "Equipment could not be loaded.");
    });
  }, [publicId]);

  if (message) return <p role="alert">{message}</p>;
  if (!equipment) return <p>Loading equipment…</p>;

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
    <article className="card">
      <p className="eyebrow">{equipment.assetId}</p>
      <h2>{equipment.name}</h2>
      <p>
        {equipment.category} · {equipment.location}
      </p>
      <p>Status: {equipment.currentStatus}</p>
      {equipment.description ? <p>{equipment.description}</p> : null}
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
      {message ? <p role="status">{message}</p> : null}
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
    </article>
  );
}
