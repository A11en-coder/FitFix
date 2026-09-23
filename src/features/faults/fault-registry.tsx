"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FaultItem = {
  reference: string;
  title: string;
  severity: string;
  status: string;
  equipment: { assetId: string; name: string; location: string };
};

export function FaultRegistry() {
  const [items, setItems] = useState<FaultItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/faults").then(async (response) => {
      const body = await response.json();
      if (response.ok) setItems(body.items);
      else setMessage(body.message ?? "Faults could not be loaded.");
    });
  }, []);

  return (
    <section>
      <div className="equipment-toolbar">
        <p>Reported faults are retained as a historical record.</p>
        <Link className="button button--accent" href="/faults/new">
          Report a fault
        </Link>
      </div>
      {message ? <p role="alert">{message}</p> : null}
      <div className="grid">
        {items.map((item) => (
          <article className="card" key={item.reference}>
            <p className="eyebrow">{item.reference}</p>
            <h2>{item.title}</h2>
            <p>
              {item.equipment.name} · {item.equipment.assetId}
            </p>
            <p>
              Severity: {item.severity} · Status: {item.status}
            </p>
            <Link className="button" href={`/faults/${item.reference}`}>
              Open report
            </Link>
          </article>
        ))}
      </div>
      {items.length === 0 && !message ? (
        <div className="card">
          <p>No faults are waiting for review.</p>
        </div>
      ) : null}
    </section>
  );
}
