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
  assigneeMember: string | null;
  externalTechnician: { id: string; name: string; company: string | null } | null;
  mediaAssets: { id: string; secureUrl: string }[];
  updates: { id: string; body: string; authorName: string }[];
  permittedActions: string[];
};

export function FaultReview({ reference }: { reference: string }) {
  const [fault, setFault] = useState<Fault | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/faults/${reference}`)
      .then(async (response) => {
        const body = await response.json();
        if (response.ok) setFault(body.fault);
        else setMessage(body.message ?? "Fault could not be loaded.");
      })
      .catch(() => setMessage("Fault could not be loaded. Check your connection and retry."))
      .finally(() => setLoading(false));
  }, [reference]);

  if (message) return <p role="alert">{message}</p>;
  if (loading || !fault) return <p role="status">Loading fault…</p>;

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

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentFault = fault;
    if (!currentFault) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    const assigneeType = String(form.get("assigneeType"));
    const body =
      assigneeType === "INTERNAL"
        ? {
            assigneeType,
            assigneeMemberId: form.get("assigneeMemberId"),
            targetDate: form.get("targetDate"),
            version: currentFault.version,
          }
        : {
            assigneeType,
            targetDate: form.get("targetDate"),
            version: currentFault.version,
            externalTechnician: {
              name: form.get("externalName"),
              company: form.get("externalCompany") || undefined,
              email: form.get("externalEmail") || undefined,
              phone: form.get("externalPhone") || undefined,
            },
          };
    const response = await fetch(`/api/faults/${reference}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const responseBody = await response.json();
    if (response.ok) {
      const refreshed = await fetch(`/api/faults/${reference}`);
      if (refreshed.ok) setFault((await refreshed.json()).fault);
    } else setMessage(responseBody.message ?? "The fault could not be assigned.");
    setSaving(false);
  }

  function loadStaff() {
    if (staff.length) return;
    void fetch("/api/staff").then(async (response) => {
      if (response.ok) {
        const body = await response.json();
        setStaff(
          body.members
            .filter((member: { status: string }) => member.status === "ACTIVE")
            .map((member: { id: string; user: { displayName: string } }) => ({
              id: member.id,
              name: member.user.displayName,
            })),
        );
      }
    });
  }

  async function transition(path: string, body: Record<string, unknown>) {
    const currentFault = fault;
    if (!currentFault) return;
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/faults/${reference}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, version: currentFault.version }),
    });
    const responseBody = await response.json();
    if (response.ok) {
      const refreshed = await fetch(`/api/faults/${reference}`);
      if (refreshed.ok) setFault((await refreshed.json()).fault);
    } else setMessage(responseBody.message ?? "The fault could not be updated.");
    setSaving(false);
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await transition("updates", { body: form.get("body") });
    formElement.reset();
  }

  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await transition("resolve", { resolutionSummary: form.get("resolutionSummary") });
  }

  async function close(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await transition("close", {
      repairCost: form.get("repairCost") || undefined,
      equipmentStatus: form.get("equipmentStatus") || undefined,
    });
  }

  async function reopen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await transition("reopen", { reason: form.get("reason") });
  }

  return (
    <article aria-busy={saving}>
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
      {fault.assigneeMember || fault.externalTechnician ? (
        <section className="card">
          <h2>Assignment</h2>
          <p>
            Assigned to {fault.assigneeMember ?? fault.externalTechnician?.name}
            {fault.externalTechnician?.company ? ` (${fault.externalTechnician.company})` : ""}.
          </p>
        </section>
      ) : null}
      {fault.permittedActions.includes("ASSIGN") ? (
        <form className="equipment-form" onSubmit={assign}>
          <h2>Assign repair</h2>
          <label>
            Assignment type
            <select name="assigneeType" defaultValue="INTERNAL" onChange={loadStaff}>
              <option value="INTERNAL">Internal staff</option>
              <option value="EXTERNAL">External technician</option>
            </select>
          </label>
          <label>
            Internal staff member
            <select name="assigneeMemberId" onFocus={loadStaff}>
              <option value="">Choose a staff member</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target date
            <input name="targetDate" type="date" required />
          </label>
          <fieldset>
            <legend>External technician details (when selected)</legend>
            <label>
              Name
              <input name="externalName" maxLength={120} />
            </label>
            <label>
              Company
              <input name="externalCompany" maxLength={160} />
            </label>
            <label>
              Email
              <input name="externalEmail" type="email" maxLength={254} />
            </label>
            <label>
              Phone
              <input name="externalPhone" maxLength={40} />
            </label>
          </fieldset>
          <button className="button button--accent" disabled={saving} type="submit">
            {saving ? "Saving…" : "Assign repair"}
          </button>
        </form>
      ) : null}
      {fault.permittedActions.includes("START") ? (
        <p>
          <button
            className="button button--accent"
            disabled={saving}
            onClick={() => void transition("start", {})}
            type="button"
          >
            {saving ? "Saving…" : "Start repair"}
          </button>
        </p>
      ) : null}
      {fault.permittedActions.includes("COMMENT") ? (
        <form className="equipment-form" onSubmit={submitUpdate}>
          <h2>Add update</h2>
          <label>
            Progress update
            <textarea name="body" required maxLength={5000} />
          </label>
          <button className="button" disabled={saving} type="submit">
            Post update
          </button>
        </form>
      ) : null}
      {fault.permittedActions.includes("RESOLVE") ? (
        <form className="equipment-form" onSubmit={resolve}>
          <h2>Mark resolved</h2>
          <label>
            Resolution summary
            <textarea name="resolutionSummary" required maxLength={5000} />
          </label>
          <button className="button button--accent" disabled={saving} type="submit">
            Mark resolved
          </button>
        </form>
      ) : null}
      {fault.permittedActions.includes("CLOSE") ? (
        <form className="equipment-form" onSubmit={close}>
          <h2>Verify and close</h2>
          <label>
            Repair cost
            <input name="repairCost" type="number" min="0" step="0.01" />
          </label>
          <label>
            Equipment status after repair
            <select name="equipmentStatus" defaultValue="">
              <option value="">Leave current status unchanged</option>
              <option value="AVAILABLE">Available</option>
              <option value="LIMITED">Limited</option>
              <option value="OUT_OF_SERVICE">Out of service</option>
            </select>
          </label>
          <button className="button button--accent" disabled={saving} type="submit">
            Close fault
          </button>
        </form>
      ) : null}
      {fault.permittedActions.includes("REOPEN") ? (
        <form className="equipment-form" onSubmit={reopen}>
          <h2>Reopen fault</h2>
          <label>
            Reason
            <textarea name="reason" required maxLength={5000} />
          </label>
          <button className="button" disabled={saving} type="submit">
            Reopen fault
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
      {message ? (
        <p aria-live="assertive" role="alert">
          {message}
        </p>
      ) : null}
    </article>
  );
}
