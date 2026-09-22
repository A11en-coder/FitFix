import { EquipmentDetail } from "../../../../features/equipment/equipment-detail";

export const dynamic = "force-dynamic";

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  return (
    <main>
      <p className="eyebrow">Equipment</p>
      <h1>Equipment details.</h1>
      <EquipmentDetail publicId={(await params).publicId} />
    </main>
  );
}
