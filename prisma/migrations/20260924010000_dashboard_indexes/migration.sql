-- Dashboard aggregate queries need efficient tenant-scoped overdue and assignment filters.
CREATE INDEX "FaultReport_gymId_targetDate_idx"
ON "FaultReport"("gymId", "targetDate");

CREATE INDEX "FaultReport_gymId_assigneeMemberId_status_idx"
ON "FaultReport"("gymId", "assigneeMemberId", "status");
