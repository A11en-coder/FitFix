import { NotificationCenter } from "../../../features/notifications/notification-center";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <main>
      <p className="eyebrow">Workspace</p>
      <h1>Notifications.</h1>
      <p className="lede">
        Stay current on assignments, resolutions, closures, and reopened faults.
      </p>
      <NotificationCenter />
    </main>
  );
}
