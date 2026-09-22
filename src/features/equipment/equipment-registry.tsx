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
  const [canManage, setCanManage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/equipment${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (!response.ok) {
      setMessage("Equipment could not be loaded.");
      return;
    }
    const body = await response.json();
    setItems(body.items);
    setCanManage(body.canManage);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

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
          <p>No active equipment matches this search.</p>
        </div>
      ) : null}
    </section>
  );
}
