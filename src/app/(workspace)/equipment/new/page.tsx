import { EquipmentForm } from "../../../../features/equipment/equipment-form";

export const dynamic = "force-dynamic";

export default function NewEquipmentPage() {
  return (
    <main>
      <p className="eyebrow">Registry</p>
      <h1>Add equipment.</h1>
      <p className="lede">Create a durable equipment record for your gym.</p>
      <EquipmentForm />
    </main>
  );
}
