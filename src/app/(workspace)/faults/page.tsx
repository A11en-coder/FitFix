import { FaultRegistry } from "../../../features/faults/fault-registry";

export const dynamic = "force-dynamic";

export default function FaultsPage() {
  return (
    <main>
      <p className="eyebrow">Maintenance</p>
      <h1>Faults.</h1>
      <p className="lede">
        Review reported issues, preserve their history, and keep equipment status accurate.
      </p>
      <FaultRegistry />
    </main>
  );
}
