import { memo, type JSX } from "react";
import type { ApplicationStatus } from "../../types/application";

type StatusBadgeProps = {
  status: ApplicationStatus;
};

type StatusBadgeConfig = {
  badgeClassName: string;
  label: string;
  Icon: () => JSX.Element;
};

const ReviewIcon = () => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5.25v3.1l2.05 1.25" />
    </svg>
  );
};

const AcceptedIcon = () => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.75 8.2 2.55 2.55 6-6" />
    </svg>
  );
};

const WaitlistedIcon = () => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M5.2 8h5.6" />
      <path d="M8 5.2v5.6" />
    </svg>
  );
};

const PartialIcon = () => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8h9" />
      <path d="m4.25 5.25 2 2-2 2" />
      <path d="m11.75 5.25-2 2 2 2" />
    </svg>
  );
};

const statusBadgeConfig: Record<ApplicationStatus, StatusBadgeConfig> = {
  RECEIVED: {
    badgeClassName: "bg-info/15 text-info ring-info/20",
    label: "En revue",
    Icon: ReviewIcon
  },
  IN_REVIEW: {
    badgeClassName: "bg-info/15 text-info ring-info/20",
    label: "En revue",
    Icon: ReviewIcon
  },
  ACCEPTED: {
    badgeClassName: "bg-success/15 text-success ring-success/20",
    label: "Acceptée",
    Icon: AcceptedIcon
  },
  REFUSED: {
    badgeClassName: "bg-info/15 text-info ring-info/20",
    label: "Liste d'attente",
    Icon: WaitlistedIcon
  },
  WAITLISTED: {
    badgeClassName: "bg-info/15 text-info ring-info/20",
    label: "Liste d'attente",
    Icon: WaitlistedIcon
  },
  PARTIALLY_ACCEPTED: {
    badgeClassName: "bg-secondary/15 text-secondaryDark ring-secondary/25",
    label: "Décision partielle",
    Icon: PartialIcon
  }
};

const StatusBadge = memo(({ status }: StatusBadgeProps) => {
  const { badgeClassName, label, Icon } = statusBadgeConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${badgeClassName}`}
    >
      <Icon />
      <span>{label}</span>
    </span>
  );
});

StatusBadge.displayName = "StatusBadge";

export default StatusBadge;
