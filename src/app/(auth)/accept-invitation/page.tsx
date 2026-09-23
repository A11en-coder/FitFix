import { Suspense } from "react";
import { InvitationAcceptance } from "../../../features/auth/invitation-acceptance";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<main className="auth-shell">Loading invitation…</main>}>
      <InvitationAcceptance />
    </Suspense>
  );
}
