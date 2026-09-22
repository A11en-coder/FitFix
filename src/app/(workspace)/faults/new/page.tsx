import { FaultDraftForm } from "../../../../features/faults/fault-draft-form";

export const dynamic = "force-dynamic";

export default async function NewFaultPage({
  searchParams,
}: {
  searchParams: Promise<{ equipmentPublicId?: string; draftId?: string }>;
}) {
  const { equipmentPublicId, draftId } = await searchParams;
  return (
    <main>
      <p className="eyebrow">Fault report</p>
      <h1>Record an equipment problem.</h1>
      <p>Save your progress as a draft while you collect the details and photos.</p>
      <FaultDraftForm equipmentPublicId={equipmentPublicId} draftId={draftId} />
    </main>
  );
}
