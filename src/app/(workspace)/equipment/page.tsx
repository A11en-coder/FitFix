import { EquipmentRegistry } from "../../../features/equipment/equipment-registry";

export const dynamic = "force-dynamic";

export default function EquipmentPage() {
  return (
    <main>
      <p className="eyebrow">Registry</p>
      <h1>Equipment.</h1>
      <p className="lede">
        Find gym equipment by name or asset ID and keep its availability information current.
      </p>
      <EquipmentRegistry />
    </main>
  );
}
