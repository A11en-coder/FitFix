"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Range = { from: string; to: string };
type EquipmentSummary = { publicId: string; assetId: string; name: string };

type ManagerDashboard = {
  role: "MANAGER";
  range: Range;
  metrics: {
    activeFaults: number;
    highSeverityFaults: number;
    overdueRepairs: number;
    outOfServiceEquipment: number;
  };
  attentionItems: Array<{
    reference: string;
    title: string;
    severity: string;
    status: string;
    targetDate: string | null;
    assignee: string;
    equipment: EquipmentSummary & { currentStatus: string };
  }>;
  equipmentStatusBreakdown: Array<{ status: string; count: number }>;
  averageResolutionHours: number | null;
  trend: Array<{ date: string; opened: number; resolved: number }>;
  recurringEquipment: Array<EquipmentSummary & { count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    body: string | null;
    createdAt: string;
    authorName: string;
    fault: { publicReference: string; title: string };
  }>;
};

type StaffDashboard = {
  role: "STAFF";
  range: Range;
  metrics: { assignedTasks: number; myReports: number; currentOutages: number };
  assignedTasks: Array<{
    publicReference: string;
    title: string;
    severity: string;
    status: string;
    targetDate: string | null;
    equipment: EquipmentSummary;
  }>;
  myReports: Array<{
    publicReference: string;
    title: string;
    status: string;
    createdAt: string;
    equipment: EquipmentSummary;
  }>;
  currentOutages: Array<EquipmentSummary & { location: string }>;
};

type DashboardResponse = ManagerDashboard | StaffDashboard;

function dateInput(daysAgo: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - daysAgo);
  return value.toISOString().slice(0, 10);
}

function displayDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

function MetricCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link className="card dashboard-metric" href={href}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Open filtered list →</small>
    </Link>
  );
}

function ManagerView({ dashboard }: { dashboard: ManagerDashboard }) {
  return (
    <>
      <div className="dashboard-metric-grid">
        <MetricCard
          label="Active faults"
          value={dashboard.metrics.activeFaults}
          href="/faults?active=true"
        />
        <MetricCard
          label="High severity"
          value={dashboard.metrics.highSeverityFaults}
          href="/faults?highSeverity=true"
        />
        <MetricCard
          label="Overdue repairs"
          value={dashboard.metrics.overdueRepairs}
          href="/faults?overdue=true"
        />
        <MetricCard
          label="Out of service"
          value={dashboard.metrics.outOfServiceEquipment}
          href="/equipment?status=OUT_OF_SERVICE"
        />
      </div>

      <div className="dashboard-grid dashboard-grid--wide">
        <section className="card dashboard-section">
          <div className="dashboard-section__heading">
            <div>
              <p className="eyebrow">Priority queue</p>
              <h2>Requires attention</h2>
            </div>
            <Link href="/faults?active=true">View all</Link>
          </div>
          {dashboard.attentionItems.length ? (
            <div className="dashboard-list">
              {dashboard.attentionItems.map((fault) => (
                <article key={fault.reference}>
                  <div>
                    <Link href={`/faults/${fault.reference}`}>
                      <strong>{fault.title}</strong>
                    </Link>
                    <p>
                      {fault.equipment.name} · {fault.severity} · {fault.status}
                    </p>
                  </div>
                  <div>
                    <p>{fault.assignee}</p>
                    <small>Target: {displayDate(fault.targetDate)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p>No active faults require attention.</p>
          )}
        </section>

        <section className="card dashboard-section">
          <p className="eyebrow">Equipment</p>
          <h2>Availability</h2>
          <div className="dashboard-list">
            {dashboard.equipmentStatusBreakdown.map((item) => (
              <div className="dashboard-list__row" key={item.status}>
                <span>{item.status}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
          <p>
            Average resolution: {dashboard.averageResolutionHours ?? "No completed repairs"}
            {dashboard.averageResolutionHours !== null ? " hours" : ""}
          </p>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="card dashboard-section">
          <p className="eyebrow">Trend</p>
          <h2>Opened versus resolved</h2>
          <div className="dashboard-list">
            {dashboard.trend.map((point) => (
              <div className="dashboard-list__row" key={point.date}>
                <span>{displayDate(point.date)}</span>
                <span>
                  Opened {point.opened} · Resolved {point.resolved}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card dashboard-section">
          <p className="eyebrow">Patterns</p>
          <h2>Recurring equipment</h2>
          {dashboard.recurringEquipment.length ? (
            <div className="dashboard-list">
              {dashboard.recurringEquipment.map((equipment) => (
                <Link
                  className="dashboard-list__row"
                  href={`/equipment/${equipment.publicId}`}
                  key={equipment.publicId}
                >
                  <span>
                    {equipment.name} · {equipment.assetId}
                  </span>
                  <strong>{equipment.count} faults</strong>
                </Link>
              ))}
            </div>
          ) : (
            <p>No recurring faults in this date range.</p>
          )}
        </section>
      </div>

      <section className="card dashboard-section">
        <p className="eyebrow">Activity</p>
        <h2>Recent maintenance activity</h2>
        {dashboard.recentActivity.length ? (
          <div className="dashboard-list">
            {dashboard.recentActivity.map((activity) => (
              <Link
                className="dashboard-list__row"
                href={`/faults/${activity.fault.publicReference}`}
                key={activity.id}
              >
                <span>
                  {activity.fault.title} · {activity.type}
                </span>
                <small>
                  {activity.authorName} · {displayDate(activity.createdAt)}
                </small>
              </Link>
            ))}
          </div>
        ) : (
          <p>No maintenance activity in this date range.</p>
        )}
      </section>
    </>
  );
}

function StaffView({ dashboard }: { dashboard: StaffDashboard }) {
  return (
    <>
      <div className="dashboard-metric-grid">
        <MetricCard
          label="Assigned tasks"
          value={dashboard.metrics.assignedTasks}
          href="/faults?assignedToMe=true"
        />
        <MetricCard
          label="My reports"
          value={dashboard.metrics.myReports}
          href="/faults?reportedByMe=true"
        />
        <MetricCard
          label="Current outages"
          value={dashboard.metrics.currentOutages}
          href="/equipment?status=OUT_OF_SERVICE"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card dashboard-section">
          <p className="eyebrow">My work</p>
          <h2>Assigned tasks</h2>
          {dashboard.assignedTasks.length ? (
            <div className="dashboard-list">
              {dashboard.assignedTasks.map((task) => (
                <Link
                  className="dashboard-list__row"
                  href={`/faults/${task.publicReference}`}
                  key={task.publicReference}
                >
                  <span>
                    {task.title} · {task.equipment.name}
                  </span>
                  <small>
                    {task.status} · Target: {displayDate(task.targetDate)}
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <p>No assigned tasks.</p>
          )}
        </section>

        <section className="card dashboard-section">
          <p className="eyebrow">Reporting</p>
          <h2>My recent reports</h2>
          {dashboard.myReports.length ? (
            <div className="dashboard-list">
              {dashboard.myReports.map((report) => (
                <Link
                  className="dashboard-list__row"
                  href={`/faults/${report.publicReference}`}
                  key={report.publicReference}
                >
                  <span>
                    {report.title} · {report.equipment.name}
                  </span>
                  <small>
                    {report.status} · {displayDate(report.createdAt)}
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <p>No reports in this date range.</p>
          )}
        </section>
      </div>

      <section className="card dashboard-section">
        <p className="eyebrow">Safety</p>
        <h2>Current outages</h2>
        {dashboard.currentOutages.length ? (
          <div className="dashboard-list">
            {dashboard.currentOutages.map((equipment) => (
              <Link
                className="dashboard-list__row"
                href={`/equipment/${equipment.publicId}`}
                key={equipment.publicId}
              >
                <span>
                  {equipment.name} · {equipment.assetId}
                </span>
                <small>{equipment.location}</small>
              </Link>
            ))}
          </div>
        ) : (
          <p>No equipment is currently out of service.</p>
        )}
      </section>
    </>
  );
}

export function Dashboard() {
  const [fromInput, setFromInput] = useState(() => dateInput(29));
  const [toInput, setToInput] = useState(() => dateInput(0));
  const [range, setRange] = useState<Range>({ from: dateInput(29), to: dateInput(0) });
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (selectedRange: Range) => {
    setLoading(true);
    const params = new URLSearchParams(selectedRange);
    const response = await fetch(`/api/dashboard?${params.toString()}`);
    const body = await response.json().catch(() => null);
    if (response.ok) {
      setDashboard(body);
      setMessage(null);
    } else setMessage(body?.message ?? "Dashboard could not be loaded.");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  function submitRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRange({ from: fromInput, to: toInput });
  }

  return (
    <section className="dashboard-shell">
      <form className="dashboard-toolbar" onSubmit={submitRange}>
        <label>
          From
          <input
            type="date"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
          />
        </label>
        <label>
          To
          <input type="date" value={toInput} onChange={(event) => setToInput(event.target.value)} />
        </label>
        <button className="button button--accent" type="submit">
          Update dashboard
        </button>
        <Link className="button" href="/faults/new">
          Report a fault
        </Link>
        <Link className="button" href="/notifications">
          Notifications
        </Link>
      </form>
      {loading ? <p role="status">Loading dashboard…</p> : null}
      {message ? <p role="alert">{message}</p> : null}
      {!loading && dashboard?.role === "MANAGER" ? <ManagerView dashboard={dashboard} /> : null}
      {!loading && dashboard?.role === "STAFF" ? <StaffView dashboard={dashboard} /> : null}
    </section>
  );
}
