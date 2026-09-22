"use client";

import { FormEvent, useEffect, useState } from "react";

type StaffResponse = {
  members: Array<{
    id: string;
    role: string;
    status: string;
    user: { displayName: string; email: string };
  }>;
  invitations: Array<{ id: string; email: string; role: string; status: string }>;
};

export function StaffManagement() {
  const [data, setData] = useState<StaffResponse | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [invitationKey, setInvitationKey] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  // This function loads the list of staff members and pending invitations from the server. It sends a GET request to the /api/staff endpoint and updates the component state with the retrieved data or an error message if the request fails.
  async function load() {
    const response = await fetch("/api/staff");
    if (response.ok) setData(await response.json());
    else setMessage("Staff could not be loaded.");
  }

  useEffect(() => {
    void load();
  }, []);

  // This function handles the invitation of a new staff member.
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Generate a unique idempotency key for the invitation request
    const key = invitationKey ?? crypto.randomUUID();
    setInvitationKey(key);
    setInviting(true);
    try {
      // Send a POST request to the server to invite a new staff member with the provided email and role. The request includes an idempotency key to prevent duplicate invitations.
      const response = await fetch("/api/staff/invitations", {
        method: "POST",
        headers: { "content-type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ email, role: "STAFF" }),
      });
      const body = await response.json().catch(() => null);
      setMessage(response.ok ? "Invitation sent." : (body?.message ?? "Invitation failed."));
      if (response.ok) {
        setEmail("");
        setInvitationKey(null);
        await load();
      }
    } catch {
      setMessage("The invitation request failed. You can retry safely.");
    } finally {
      setInviting(false);
    }
  }

  // This function deactivates a staff member by sending a POST request to the server.
  async function deactivate(memberId: string) {
    const response = await fetch(`/api/staff/${memberId}/deactivate`, { method: "POST" });
    setMessage(
      response.ok
        ? "Staff access deactivated."
        : ((await response.json()).message ?? "Deactivation failed."),
    );
    if (response.ok) await load();
  }

  // This function changes the role of a staff member by sending a PATCH request to the server with the new role.
  async function changeRole(memberId: string, role: string) {
    const response = await fetch(`/api/staff/${memberId}/role`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setMessage(
      response.ok ? "Role updated." : ((await response.json()).message ?? "Role change failed."),
    );
    if (response.ok) await load();
  }

  return (
    <section className="staff-management">
      <form className="card onboarding-form" onSubmit={invite} aria-busy={inviting}>
        <label>
          Invite staff by email
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setInvitationKey(null);
            }}
            required
            disabled={inviting}
          />
        </label>
        <button className="button button--accent" type="submit" disabled={inviting}>
          {inviting ? "Sending…" : "Send invitation"}
        </button>
      </form>
      {message ? <p role="status">{message}</p> : null}
      <div className="grid">
        {data?.members.map((member) => (
          <article className="card" key={member.id}>
            <h2>{member.user.displayName}</h2>
            <p>{member.user.email}</p>
            <p>
              {member.role} · {member.status}
            </p>
            {member.status === "ACTIVE" ? (
              <>
                <label>
                  Role
                  <select
                    value={member.role}
                    onChange={(event) => void changeRole(member.id, event.target.value)}
                  >
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </label>
                <button className="button" onClick={() => void deactivate(member.id)}>
                  Deactivate
                </button>
              </>
            ) : null}
          </article>
        ))}
      </div>
      {data?.invitations.length ? (
        <div className="card">
          <h2>Pending invitations</h2>
          {data.invitations.map((invitation) => (
            <p key={invitation.id}>
              {invitation.email} · {invitation.role}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
