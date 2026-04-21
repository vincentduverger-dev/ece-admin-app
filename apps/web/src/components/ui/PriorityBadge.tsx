import { memo } from "react";

type PriorityBadgeProps = {
  isPriority: boolean;
};

const PriorityBadge = memo(({ isPriority }: PriorityBadgeProps) => {
  if (!isPriority) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-secondaryDark ring-1 ring-secondary/30">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 flex-none"
        fill="currentColor"
      >
        <path d="m8 2.15 1.62 3.28 3.62.52-2.62 2.55.62 3.6L8 10.4l-3.24 1.7.62-3.6L2.76 5.95l3.62-.52L8 2.15Z" />
      </svg>
      <span>Prioritaire</span>
    </span>
  );
});

PriorityBadge.displayName = "PriorityBadge";

export default PriorityBadge;
