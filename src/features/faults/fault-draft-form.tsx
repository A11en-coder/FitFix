"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "../ui/confirm-dialog";

type DraftMedia = {
  id: string;
  secureUrl: string;
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
  state: string;
};

type Draft = {
  id: string;
  title?: string | null;
  description?: string | null;
  severity?: string | null;
  equipmentStatus?: string | null;
  immediateAction?: string | null;
  discoveredAt?: string | null;
  equipmentPublicId?: string | null;
  version: number;
  mediaAssets: DraftMedia[];
};

type FormState = {
  equipmentPublicId: string;
  title: string;
  description: string;
  severity: string;
  equipmentStatus: string;
  immediateAction: string;
  discoveredAt: string;
};

const initialForm: FormState = {
  equipmentPublicId: "",
  title: "",
  description: "",
  severity: "",
  equipmentStatus: "",
  immediateAction: "",
  discoveredAt: "",
};

export function FaultDraftForm({
  equipmentPublicId = "",
  draftId = "",
}: {
  equipmentPublicId?: string;
  draftId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...initialForm, equipmentPublicId });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<Array<keyof FormState>>([]);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);
  const submissionKey = useRef<string | null>(null);

  useEffect(() => {
    const storageKey = `fitfix:fault-draft:${equipmentPublicId || "unassigned"}`;
    const savedId = draftId || window.localStorage.getItem(storageKey);
    if (!savedId) return;
    void fetch(`/api/fault-drafts/${savedId}`).then(async (response) => {
      if (!response.ok) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      const loaded = (await response.json()) as Draft;
      setDraft(loaded);
      setForm({
        equipmentPublicId: loaded.equipmentPublicId ?? equipmentPublicId,
        title: loaded.title ?? "",
        description: loaded.description ?? "",
        severity: loaded.severity ?? "",
        equipmentStatus: loaded.equipmentStatus ?? "",
        immediateAction: loaded.immediateAction ?? "",
        discoveredAt: loaded.discoveredAt ? loaded.discoveredAt.slice(0, 16) : "",
      });
      window.localStorage.setItem(storageKey, loaded.id);
      setMessage("Draft resumed.");
    });
  }, [draftId, equipmentPublicId]);

  function updateField(field: keyof FormState, value: string) {
    setMissingFields((current) => current.filter((name) => name !== field));
    setForm((current) => ({ ...current, [field]: value }));
  }

  function focusField(field: keyof FormState) {
    document
      .querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${field}"]`,
      )
      ?.focus();
  }

  async function persistDraft(existingDraft: Draft | null = draft) {
    const payload = {
      equipmentPublicId: form.equipmentPublicId || null,
      title: form.title || null,
      description: form.description || null,
      severity: form.severity || null,
      equipmentStatus: form.equipmentStatus || null,
      immediateAction: form.immediateAction || null,
      discoveredAt: form.discoveredAt ? new Date(form.discoveredAt).toISOString() : null,
      ...(existingDraft ? { version: existingDraft.version } : {}),
    };
    const response = await fetch(
      existingDraft ? `/api/fault-drafts/${existingDraft.id}` : "/api/fault-drafts",
      {
        method: existingDraft ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message ?? "The draft could not be saved.");
    const savedDraft = body as Draft;
    setDraft(savedDraft);
    window.localStorage.setItem(
      `fitfix:fault-draft:${form.equipmentPublicId || "unassigned"}`,
      savedDraft.id,
    );
    return savedDraft;
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await persistDraft();
      setMessage("Draft saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The draft could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function submitFault() {
    const requiredFields: Array<{ key: keyof FormState; label: string }> = [
      { key: "equipmentPublicId", label: "equipment" },
      { key: "title", label: "title" },
      { key: "description", label: "description" },
      { key: "severity", label: "severity" },
      { key: "equipmentStatus", label: "equipment status" },
      { key: "discoveredAt", label: "discovery time" },
    ];
    const missing = requiredFields.filter(({ key }) => !form[key]);
    if (missing.length) {
      setMissingFields(missing.map(({ key }) => key));
      setMessage(
        `Complete the following before submitting: ${missing.map(({ label }) => label).join(", ")}.`,
      );
      focusField(missing[0].key);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const currentDraft = draft ?? (await persistDraft());
      submissionKey.current ??= window.crypto.randomUUID();
      const response = await fetch("/api/faults", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": submissionKey.current,
        },
        body: JSON.stringify({
          draftId: currentDraft.id,
          equipmentPublicId: form.equipmentPublicId,
          title: form.title,
          description: form.description,
          severity: form.severity,
          equipmentStatus: form.equipmentStatus,
          discoveredAt: new Date(form.discoveredAt).toISOString(),
          immediateAction: form.immediateAction || null,
          mediaAssetIds: currentDraft.mediaAssets.map((media) => media.id),
          version: currentDraft.version,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? "The fault could not be submitted.");
      const reference = body?.data?.reference as string | undefined;
      window.localStorage.removeItem(
        `fitfix:fault-draft:${form.equipmentPublicId || "unassigned"}`,
      );
      setDraft(null);
      setSubmittedReference(reference ?? null);
      setMessage(reference ? `Fault ${reference} submitted.` : "Fault submitted.");
      submissionKey.current = null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The fault could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  // this function uploads a file to Cloudinary and registers it as a media asset for the current draft
  async function uploadFile(file: File, currentDraft: Draft) {
    // request a Cloudinary upload signature from the server for the current draft and file
    const signatureResponse = await fetch("/api/uploads/signature", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftId: currentDraft.id, mimeType: file.type, bytes: file.size }),
    });
    const signature = await signatureResponse.json();
    if (!signatureResponse.ok) throw new Error(signature.message ?? "The upload could not start.");

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("api_key", signature.apiKey);
    uploadData.append("timestamp", String(signature.timestamp));
    uploadData.append("folder", signature.folder);
    uploadData.append("signature", signature.signature);
    uploadData.append("upload_preset", signature.uploadPreset);
    uploadData.append("allowed_formats", signature.allowedFormats);

    // upload the file to Cloudinary and get the response
    const uploadResponse = await fetch(signature.uploadUrl, { method: "POST", body: uploadData });
    const upload = await uploadResponse.json();
    if (!uploadResponse.ok)
      throw new Error(upload.error?.message ?? "Cloudinary rejected the image.");

    // After Cloudinary responds, the browser sends only the returned metadata—URL, public ID, dimensions, size—to FitFix
    const registerResponse = await fetch(`/api/fault-drafts/${currentDraft.id}/media`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cloudinaryPublicId: upload.public_id,
        secureUrl: upload.secure_url,
        mimeType: file.type,
        bytes: upload.bytes ?? file.size,
        width: upload.width,
        height: upload.height,
      }),
    });
    const registered = await registerResponse.json();
    if (!registerResponse.ok)
      throw new Error(registered.message ?? "The image could not be attached.");
    setDraft((current) =>
      current ? { ...current, mediaAssets: [...current.mediaAssets, registered.media] } : current,
    );
  }

  // this function handles file input changes, uploads the selected files, and updates the draft with the new media assets
  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setMessage(null);
    try {
      const currentDraft = draft ?? (await persistDraft());
      if (currentDraft.mediaAssets.length + files.length > 5)
        throw new Error("A draft can contain at most five photos.");
      for (const file of files) await uploadFile(file, currentDraft);
      setMessage("Photo upload complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The photo could not be uploaded.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function discard() {
    if (!draft) return;
    setDiscarding(true);
    try {
      const response = await fetch(`/api/fault-drafts/${draft.id}`, { method: "DELETE" });
      if (response.ok) {
        window.localStorage.removeItem(
          `fitfix:fault-draft:${form.equipmentPublicId || "unassigned"}`,
        );
        router.push(form.equipmentPublicId ? `/equipment/${form.equipmentPublicId}` : "/equipment");
      } else setMessage("The draft could not be discarded.");
    } catch {
      setMessage("The draft could not be discarded. Check your connection and retry.");
    } finally {
      setDiscarding(false);
    }
  }

  if (submittedReference)
    return (
      <section className="card" aria-live="polite">
        <h2>Fault submitted</h2>
        <p>
          Your report reference is <strong>{submittedReference}</strong>. A manager can now review
          it.
        </p>
        <a
          className="button"
          href={form.equipmentPublicId ? `/equipment/${form.equipmentPublicId}` : "/equipment"}
        >
          Return to equipment
        </a>
      </section>
    );

  return (
    <form
      aria-busy={saving || uploading || submitting || discarding}
      className="equipment-form"
      onSubmit={(event) => void save(event)}
    >
      <label>
        Equipment public ID
        <input
          name="equipmentPublicId"
          value={form.equipmentPublicId}
          onChange={(event) => updateField("equipmentPublicId", event.target.value)}
          maxLength={26}
          placeholder="Scan a QR code or enter an equipment ID"
        />
      </label>
      <label>
        Title
        <input
          name="title"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          maxLength={160}
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          maxLength={10000}
        />
      </label>
      <label>
        Severity
        <select
          name="severity"
          value={form.severity}
          onChange={(event) => updateField("severity", event.target.value)}
        >
          <option value="">Not set</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </label>
      <label>
        Equipment status
        <select
          name="equipmentStatus"
          value={form.equipmentStatus}
          onChange={(event) => updateField("equipmentStatus", event.target.value)}
        >
          <option value="">Not set</option>
          <option value="AVAILABLE">Available</option>
          <option value="LIMITED">Limited</option>
          <option value="OUT_OF_SERVICE">Out of service</option>
        </select>
      </label>
      <label>
        Immediate action
        <textarea
          name="immediateAction"
          value={form.immediateAction}
          onChange={(event) => updateField("immediateAction", event.target.value)}
          maxLength={5000}
        />
      </label>
      <label>
        Discovered at
        <input
          name="discoveredAt"
          type="datetime-local"
          value={form.discoveredAt}
          onChange={(event) => updateField("discoveredAt", event.target.value)}
        />
      </label>
      <label>
        Photos (up to five, 10 MB each)
        <input
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => void handleFiles(event)}
          disabled={uploading}
        />
      </label>
      {draft?.mediaAssets.length ? (
        <div className="media-grid">
          {draft.mediaAssets.map((media) => (
            <div key={media.id}>
              {/* Cloudinary URLs are user-uploaded media and are intentionally not optimized by Next. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media.secureUrl} alt="Attached fault evidence" width={160} height={120} />
            </div>
          ))}
        </div>
      ) : null}
      <div className="button-row">
        <button className="button" type="submit" disabled={saving || uploading}>
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          className="button button--accent"
          type="button"
          onClick={() => void submitFault()}
          disabled={saving || uploading || submitting}
        >
          {submitting ? "Submitting…" : "Submit fault"}
        </button>
        {draft ? (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setDiscardOpen(true)}
            disabled={saving || uploading || submitting || discarding}
          >
            {discarding ? "Discarding…" : "Discard draft"}
          </button>
        ) : null}
      </div>
      {missingFields.length ? (
        <div aria-live="assertive" className="error-summary" role="alert" tabIndex={-1}>
          <p>Complete the required fields before submitting:</p>
          <ul>
            {missingFields.map((field) => (
              <li key={field}>
                <button className="link-button" onClick={() => focusField(field)} type="button">
                  {field === "equipmentPublicId"
                    ? "Equipment"
                    : field === "equipmentStatus"
                      ? "Equipment status"
                      : field === "discoveredAt"
                        ? "Discovery time"
                        : field.charAt(0).toUpperCase() + field.slice(1)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {message ? (
        <p aria-live="polite" role="status">
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        busy={discarding}
        confirmLabel="Discard draft"
        description="Discard this saved fault draft? Its entered details and attached photos will no longer be available in FitFix."
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          void discard();
        }}
        open={discardOpen}
        title="Discard fault draft?"
      />
    </form>
  );
}
