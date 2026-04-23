export type LevelVisualStyle = {
  barColor: string;
  cardBackground: string;
  borderColor: string;
  codeBackground: string;
  codeTextColor: string;
  trackColor: string;
};

const fallbackLevelVisualStyles: LevelVisualStyle[] = [
  {
    barColor: "#2F6B52",
    cardBackground: "#F7FBF9",
    borderColor: "rgba(47,107,82,0.10)",
    codeBackground: "rgba(47,107,82,0.10)",
    codeTextColor: "#2F6B52",
    trackColor: "#E8EFF0"
  },
  {
    barColor: "#4E8769",
    cardBackground: "#F7FBF9",
    borderColor: "rgba(78,135,105,0.10)",
    codeBackground: "rgba(78,135,105,0.10)",
    codeTextColor: "#4E8769",
    trackColor: "#E8EFF0"
  },
  {
    barColor: "#76AD7A",
    cardBackground: "#F7FBF8",
    borderColor: "rgba(118,173,122,0.12)",
    codeBackground: "rgba(118,173,122,0.12)",
    codeTextColor: "#4E8769",
    trackColor: "#E8EFF0"
  },
  {
    barColor: "#A8CF8C",
    cardBackground: "#FAFCF8",
    borderColor: "rgba(168,207,140,0.16)",
    codeBackground: "rgba(168,207,140,0.18)",
    codeTextColor: "#5D8E4F",
    trackColor: "#EDF2EA"
  },
  {
    barColor: "#D4A24C",
    cardBackground: "#FCF8F0",
    borderColor: "rgba(212,162,76,0.16)",
    codeBackground: "rgba(212,162,76,0.16)",
    codeTextColor: "#B8842F",
    trackColor: "#F3E9D7"
  },
  {
    barColor: "#E2C15A",
    cardBackground: "#FDF9EF",
    borderColor: "rgba(226,193,90,0.18)",
    codeBackground: "rgba(226,193,90,0.18)",
    codeTextColor: "#B8842F",
    trackColor: "#F4EBD5"
  },
  {
    barColor: "#CF7560",
    cardBackground: "#FCF4F2",
    borderColor: "rgba(207,117,96,0.16)",
    codeBackground: "rgba(207,117,96,0.14)",
    codeTextColor: "#B85B4B",
    trackColor: "#F3E8E6"
  },
  {
    barColor: "#C8574B",
    cardBackground: "#FCF1EF",
    borderColor: "rgba(200,87,75,0.16)",
    codeBackground: "rgba(200,87,75,0.14)",
    codeTextColor: "#B14B40",
    trackColor: "#F4E5E1"
  }
];

export const getLevelVisualStyle = (
  levelCode: string,
  levelLabel = "",
  fallbackIndex = 0
): LevelVisualStyle => {
  const normalized = `${levelCode} ${levelLabel}`.trim().toUpperCase();

  if (normalized.includes("PS") || normalized.includes("MAT")) {
    return fallbackLevelVisualStyles[0];
  }

  if (normalized.includes("MS")) {
    return fallbackLevelVisualStyles[1];
  }

  if (normalized.includes("GS")) {
    return fallbackLevelVisualStyles[2];
  }

  if (normalized.includes("CP")) {
    return fallbackLevelVisualStyles[3];
  }

  if (normalized.includes("CE1")) {
    return fallbackLevelVisualStyles[4];
  }

  if (normalized.includes("CE2")) {
    return fallbackLevelVisualStyles[5];
  }

  if (normalized.includes("CM1")) {
    return fallbackLevelVisualStyles[6];
  }

  if (normalized.includes("CM2")) {
    return fallbackLevelVisualStyles[7];
  }

  return fallbackLevelVisualStyles[fallbackIndex % fallbackLevelVisualStyles.length];
};
