"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FaultItem = {
  reference: string;
  title: string;
  severity: string;
  status: string;
  equipment: { assetId: string; name: string; location: string };
};

export function FaultRegistry() {
  const [items, setItems] = useState<FaultItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [equipmentPublicId, setEquipmentPublicId] = useState("");
  const [active, setActive] = useState(false);
  const [highSeverity, setHighSeverity] = useState(false);
  const [overdue, setOverdue] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [reportedByMe, setReportedByMe] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);

  const load = useCallback(
    async (cursor?: string, append = false) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      if (severity) params.set("severity", severity);
      if (equipmentPublicId) params.set("equipmentPublicId", equipmentPublicId);
      if (active) params.set("active", "true");
      if (highSeverity) params.set("highSeverity", "true");
      if (overdue) params.set("overdue", "true");
      if (assignedToMe) params.set("assignedToMe", "true");
      if (reportedByMe) params.set("reportedByMe", "true");
      if (cursor) params.set("cursor", cursor);
      const queryString = params.toString();
      const response = await fetch(`/api/faults${queryString ? `?${queryString}` : ""}`);
      const body = await response.json();
      if (response.ok) {
        setItems((current) => (append ? [...current, ...body.items] : body.items));
        setNextCursor(body.nextCursor);
        setMessage(null);
      } else setMessage(body.message ?? "Faults could not be loaded.");
    },
    [
      active,
      assignedToMe,
      equipmentPublicId,
      highSeverity,
      overdue,
      query,
      reportedByMe,
      severity,
      status,
    ],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setStatus(params.get("status") ?? "");
    setSeverity(params.get("severity") ?? "");
    setEquipmentPublicId(params.get("equipmentPublicId") ?? "");
    setActive(params.get("active") === "true");
    setHighSeverity(params.get("highSeverity") === "true");
    setOverdue(params.get("overdue") === "true");
    setAssignedToMe(params.get("assignedToMe") === "true");
    setReportedByMe(params.get("reportedByMe") === "true");
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (filtersReady) void load();
  }, [filtersReady, load]);

  return (
    <section>
      <div className="equipment-toolbar">
        <p>Reported faults are retained as a historical record.</p>
        <input
          aria-label="Search faults"
          placeholder="Search reference, title, equipment"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Filter faults by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="REPORTED">Reported</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          aria-label="Filter faults by severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
        >
          <option value="">All severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <input
          aria-label="Filter faults by equipment ID"
          placeholder="Equipment public ID"
          value={equipmentPublicId}
          onChange={(event) => setEquipmentPublicId(event.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active only
        </label>
        <label>
          <input
            type="checkbox"
            checked={highSeverity}
            onChange={(event) => setHighSeverity(event.target.checked)}
          />
          High severity
        </label>
        <label>
          <input
            type="checkbox"
            checked={overdue}
            onChange={(event) => setOverdue(event.target.checked)}
          />
          Overdue
        </label>
        <label>
          <input
            type="checkbox"
            checked={assignedToMe}
            onChange={(event) => setAssignedToMe(event.target.checked)}
          />
          Assigned to me
        </label>
        <label>
          <input
            type="checkbox"
            checked={reportedByMe}
            onChange={(event) => setReportedByMe(event.target.checked)}
          />
          Reported by me
        </label>
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
      {nextCursor ? (
        <button className="button" onClick={() => void load(nextCursor, true)}>
          Load more
        </button>
      ) : null}
    </section>
  );
}
