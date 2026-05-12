import { getLevelVisualStyle } from "../../lib/levelVisuals";

type LevelBadgeSize = "xs" | "sm" | "md";

type LevelBadgeProps = {
  className?: string;
  code: string;
  label?: string;
  size?: LevelBadgeSize;
};

const sizeClasses: Record<LevelBadgeSize, string> = {
  xs: "px-2.5 py-1 text-[0.62rem] tracking-[0.16em]",
  sm: "px-3 py-1.5 text-[0.66rem] tracking-[0.18em]",
  md: "px-3.5 py-1.5 text-[0.68rem] tracking-[0.22em]"
};

const joinClassNames = (...classNames: Array<string | undefined>): string => {
  return classNames.filter(Boolean).join(" ");
};

const LevelBadge = ({
  className,
  code,
  label = "",
  size = "sm"
}: LevelBadgeProps) => {
  const visual = getLevelVisualStyle(code, label);
  const displayCode = code.trim().toUpperCase() || "N/A";
  const title = label.trim().length > 0 ? `${label} (${displayCode})` : displayCode;

  return (
    <span
      title={title}
      className={joinClassNames(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full border font-semibold uppercase",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: visual.codeBackground,
        borderColor: visual.borderColor,
        color: visual.codeTextColor
      }}
    >
      {displayCode}
    </span>
  );
};

export default LevelBadge;
