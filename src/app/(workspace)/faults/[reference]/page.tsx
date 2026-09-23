import { FaultReview } from "../../../../features/faults/fault-review";

export const dynamic = "force-dynamic";

export default async function FaultDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <main>
      <p className="eyebrow">Fault review</p>
      <FaultReview reference={reference} />
    </main>
  );
}
