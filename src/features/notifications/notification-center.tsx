"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  destination: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      const body = await response.json();
      if (response.ok) {
        setItems(body.items);
        setUnreadCount(body.unreadCount);
        setMessage(null);
      } else setMessage(body.message ?? "Notifications could not be loaded.");
    } catch {
      setMessage("Notifications could not be loaded. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(notificationId: string) {
    setUpdating(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (response.ok) await load();
      else setMessage("The notification could not be updated.");
    } catch {
      setMessage("The notification could not be updated. Check your connection and retry.");
    } finally {
      setUpdating(false);
    }
  }

  async function markAllRead() {
    setUpdating(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (response.ok) await load();
      else setMessage("Notifications could not be marked as read.");
    } catch {
      setMessage("Notifications could not be marked as read. Check your connection and retry.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section aria-busy={loading || updating}>
      <div className="equipment-toolbar">
        <p>
          {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}.
        </p>
        {unreadCount ? (
          <button
            className="button"
            disabled={updating}
            onClick={() => void markAllRead()}
            type="button"
          >
            {updating ? "Updating…" : "Mark all as read"}
          </button>
        ) : null}
      </div>
      {loading ? (
        <p className="async-state" role="status">
          Loading notifications…
        </p>
      ) : null}
      {message ? (
        <p aria-live="assertive" role="alert">
          {message}
        </p>
      ) : null}
      <div className="grid">
        {items.map((item) => (
          <article className={`card${item.readAt ? "" : " card--unread"}`} key={item.id}>
            <p className="eyebrow">{item.readAt ? "Read" : "Unread"}</p>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <div className="button-row">
              <Link
                className="button button--accent"
                href={item.destination}
                onClick={() => void markRead(item.id)}
              >
                Open
              </Link>
              {!item.readAt ? (
                <button
                  className="button button-secondary"
                  disabled={updating}
                  onClick={() => void markRead(item.id)}
                  type="button"
                >
                  {updating ? "Updating…" : "Mark as read"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!loading && !items.length && !message ? (
        <div className="card">
          <p>You have no notifications.</p>
        </div>
      ) : null}
    </section>
  );
}
