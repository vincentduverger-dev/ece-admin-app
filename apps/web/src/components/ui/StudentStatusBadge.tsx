import { memo } from "react";

import type {
  StudentAdmissionStatus,
  VisibleStudentAdmissionStatus
} from "../../types/application";

type StudentStatusBadgeProps = {
  status: StudentAdmissionStatus | VisibleStudentAdmissionStatus;
};

export const getVisibleStudentStatus = (
  status: StudentAdmissionStatus | VisibleStudentAdmissionStatus
): VisibleStudentAdmissionStatus | "UNPROCESSED" => {
  if (status === "PENDING") {
    return "UNPROCESSED";
  }

  return status === "ACCEPTED" ? "ACCEPTED" : "WAITLISTED";
};

const StudentStatusBadge = memo(({ status }: StudentStatusBadgeProps) => {
  const visibleStatus = getVisibleStudentStatus(status);
  const isAccepted = visibleStatus === "ACCEPTED";
  const isUnprocessed = visibleStatus === "UNPROCESSED";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${
        isUnprocessed
          ? "bg-slate-100 text-slate-600 ring-slate-200"
          : isAccepted
          ? "bg-success/15 text-success ring-success/20"
          : "bg-info/15 text-info ring-info/20"
      }`}
    >
      {isUnprocessed ? "À traiter" : isAccepted ? "Accepté" : "En attente"}
    </span>
  );
});

StudentStatusBadge.displayName = "StudentStatusBadge";

export default StudentStatusBadge;
