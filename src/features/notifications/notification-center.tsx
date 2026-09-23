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

  async function load() {
    const response = await fetch("/api/notifications");
    const body = await response.json();
    if (response.ok) {
      setItems(body.items);
      setUnreadCount(body.unreadCount);
    } else setMessage(body.message ?? "Notifications could not be loaded.");
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(notificationId: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    if (response.ok) await load();
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (response.ok) await load();
  }

  return (
    <section>
      <div className="equipment-toolbar">
        <p>
          {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}.
        </p>
        {unreadCount ? (
          <button className="button" onClick={() => void markAllRead()}>
            Mark all as read
          </button>
        ) : null}
      </div>
      {message ? <p role="alert">{message}</p> : null}
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
                <button className="button button-secondary" onClick={() => void markRead(item.id)}>
                  Mark as read
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!items.length && !message ? (
        <div className="card">
          <p>You have no notifications.</p>
        </div>
      ) : null}
    </section>
  );
}
