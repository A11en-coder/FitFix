"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

  const load = useCallback(
    async (cursor?: string, append = false) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (location) params.set("location", location);
      if (status) params.set("status", status);
      if (includeArchived) params.set("includeArchived", "true");
      if (cursor) params.set("cursor", cursor);
      const queryString = params.toString();
      const response = await fetch(`/api/equipment${queryString ? `?${queryString}` : ""}`);
      if (!response.ok) {
        setMessage("Equipment could not be loaded.");
        return;
      }
      const body = await response.json();
      setItems((current) => (append ? [...current, ...body.items] : body.items));
      setNextCursor(body.nextCursor);
      setCanManage(body.canManage);
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

  async function archive(item: EquipmentItem) {
    if (!window.confirm(`Archive ${item.name} (${item.assetId})?`)) return;
    const response = await fetch(`/api/equipment/${item.publicId}/archive`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ version: item.version }),
    });
    const body = await response.json().catch(() => null);
    setMessage(
      response.ok ? "Equipment archived." : (body?.message ?? "Equipment could not be archived."),
    );
    if (response.ok) await load();
  }

  return (
    <section>
      <div className="equipment-toolbar">
        <input
          aria-label="Search equipment"
          placeholder="Search by name or asset ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <input
          aria-label="Filter equipment by category"
          placeholder="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <input
          aria-label="Filter equipment by location"
          placeholder="Location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
        <select
          aria-label="Filter equipment by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="LIMITED">Limited</option>
          <option value="OUT_OF_SERVICE">Out of service</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <label>
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
      {message ? <p role="status">{message}</p> : null}
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
                <button className="button" onClick={() => void archive(item)}>
                  Archive
                </button>
              ) : null}
            </p>
          </article>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="card">
          <p>No equipment matches these filters.</p>
        </div>
      ) : null}
      {nextCursor ? (
        <button className="button" onClick={() => void load(nextCursor, true)}>
          Load more
        </button>
      ) : null}
    </section>
  );
}
