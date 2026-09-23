"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "../ui/confirm-dialog";

type EquipmentItem = {
  id: string;
  publicId: string;
  assetId: string;
  name: string;
  category: string;
  location: string;
  currentStatus: string;
  version: number;
  archivedAt: string | null;
};

export function EquipmentRegistry() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<EquipmentItem | null>(null);

  const load = useCallback(
    async (cursor?: string, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setMessage(null);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (location) params.set("location", location);
      if (status) params.set("status", status);
      if (includeArchived) params.set("includeArchived", "true");
      if (cursor) params.set("cursor", cursor);
      const queryString = params.toString();
      try {
        const response = await fetch(`/api/equipment${queryString ? `?${queryString}` : ""}`);
        if (!response.ok) {
          setMessage("Equipment could not be loaded.");
          return;
        }
        const body = await response.json();
        setItems((current) => (append ? [...current, ...body.items] : body.items));
        setNextCursor(body.nextCursor);
        setCanManage(body.canManage);
      } catch {
        setMessage("Equipment could not be loaded. Check your connection and retry.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, includeArchived, location, query, status],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setCategory(params.get("category") ?? "");
    setLocation(params.get("location") ?? "");
    setStatus(params.get("status") ?? "");
    setIncludeArchived(params.get("includeArchived") === "true");
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (filtersReady) void load();
  }, [filtersReady, load]);

  function archive(item: EquipmentItem) {
    setArchiveTarget(item);
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    const item = archiveTarget;
    setArchiving(true);
    try {
      const response = await fetch(`/api/equipment/${item.publicId}/archive`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: item.version }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(body?.message ?? "Equipment could not be archived.");
        return;
      }
      setArchiveTarget(null);
      await load();
      setMessage("Equipment archived.");
    } catch {
      setMessage("Equipment could not be archived. Check your connection and retry.");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <section aria-busy={loading}>
      <div aria-label="Equipment filters" className="filter-bar" role="group">
        <label>
          <span>Search equipment</span>
          <input
            placeholder="Name or asset ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>Category</span>
          <input
            placeholder="Any category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>
        <label>
          <span>Location</span>
          <input
            placeholder="Any location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited</option>
            <option value="OUT_OF_SERVICE">Out of service</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Include archived
        </label>
        {canManage ? (
          <Link className="button button--accent" href="/equipment/new">
            Add equipment
          </Link>
        ) : null}
      </div>
      {loading ? (
        <p className="async-state" role="status">
          Loading equipment…
        </p>
      ) : null}
      {message ? (
        <p aria-live="assertive" role="alert">
          {message}
        </p>
      ) : null}
      <div className="grid">
        {items.map((item) => (
          <article className="card" key={item.id}>
            <p className="eyebrow">{item.assetId}</p>
            <h2>{item.name}</h2>
            <p>
              {item.category} · {item.location}
            </p>
            <p>{item.currentStatus}</p>
            <p>
              <Link className="button" href={`/equipment/${item.publicId}`}>
                View details
              </Link>
              {canManage && !item.archivedAt ? (
                <button className="button" onClick={() => archive(item)} type="button">
                  Archive
                </button>
              ) : null}
            </p>
          </article>
        ))}
      </div>
      {!loading && items.length === 0 && !message ? (
        <div className="card">
          <p>No equipment matches these filters.</p>
        </div>
      ) : null}
      {nextCursor ? (
        <button
          className="button"
          disabled={loadingMore}
          onClick={() => void load(nextCursor, true)}
          type="button"
        >
          {loadingMore ? "Loading more…" : "Load more"}
        </button>
      ) : null}
      <ConfirmDialog
        busy={archiving}
        confirmLabel="Archive equipment"
        description={
          archiveTarget
            ? `Archive ${archiveTarget.name} (${archiveTarget.assetId})? Its history will remain available, but it will no longer appear in the active equipment list.`
            : ""
        }
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => void confirmArchive()}
        open={Boolean(archiveTarget)}
        title="Archive equipment?"
      />
    </section>
  );
}
