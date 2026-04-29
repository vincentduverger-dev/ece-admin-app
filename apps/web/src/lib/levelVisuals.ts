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
  },
  {
    barColor: "#1F7A8C",
    cardBackground: "#F2FAFB",
    borderColor: "rgba(31,122,140,0.15)",
    codeBackground: "rgba(31,122,140,0.13)",
    codeTextColor: "#176676",
    trackColor: "#E2F0F2"
  },
  {
    barColor: "#3F6FA9",
    cardBackground: "#F4F8FD",
    borderColor: "rgba(63,111,169,0.15)",
    codeBackground: "rgba(63,111,169,0.13)",
    codeTextColor: "#315D91",
    trackColor: "#E5EDF7"
  },
  {
    barColor: "#6E62B6",
    cardBackground: "#F8F6FD",
    borderColor: "rgba(110,98,182,0.15)",
    codeBackground: "rgba(110,98,182,0.13)",
    codeTextColor: "#5C509D",
    trackColor: "#ECE8F8"
  },
  {
    barColor: "#9B5CA7",
    cardBackground: "#FBF6FC",
    borderColor: "rgba(155,92,167,0.15)",
    codeBackground: "rgba(155,92,167,0.13)",
    codeTextColor: "#834C8E",
    trackColor: "#F0E6F2"
  },
  {
    barColor: "#B86E3C",
    cardBackground: "#FCF7F3",
    borderColor: "rgba(184,110,60,0.15)",
    codeBackground: "rgba(184,110,60,0.13)",
    codeTextColor: "#9B5A30",
    trackColor: "#F2E7DD"
  },
  {
    barColor: "#D06A8A",
    cardBackground: "#FDF5F8",
    borderColor: "rgba(208,106,138,0.15)",
    codeBackground: "rgba(208,106,138,0.13)",
    codeTextColor: "#AC5572",
    trackColor: "#F4E5EB"
  },
  {
    barColor: "#69727F",
    cardBackground: "#F7F8FA",
    borderColor: "rgba(105,114,127,0.16)",
    codeBackground: "rgba(105,114,127,0.13)",
    codeTextColor: "#596270",
    trackColor: "#E7EAEE"
  }
];

export const getLevelVisualStyle = (
  levelCode: string,
  levelLabel = "",
  fallbackIndex = 0
): LevelVisualStyle => {
  const normalized = `${levelCode} ${levelLabel}`.trim().toUpperCase();

  if (normalized.includes("PS") || normalized.includes("PETITE SECTION")) {
    return fallbackLevelVisualStyles[0];
  }

  if (normalized.includes("MS") || normalized.includes("MOYENNE SECTION")) {
    return fallbackLevelVisualStyles[1];
  }

  if (normalized.includes("GS") || normalized.includes("GRANDE SECTION")) {
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

  if (normalized.includes("6E") || normalized.includes("6ÈME") || normalized.includes("SIXI")) {
    return fallbackLevelVisualStyles[8];
  }

  if (normalized.includes("5E") || normalized.includes("5ÈME") || normalized.includes("CINQ")) {
    return fallbackLevelVisualStyles[9];
  }

  if (normalized.includes("4E") || normalized.includes("4ÈME") || normalized.includes("QUAT")) {
    return fallbackLevelVisualStyles[10];
  }

  if (normalized.includes("3E") || normalized.includes("3ÈME") || normalized.includes("TROIS")) {
    return fallbackLevelVisualStyles[11];
  }

  if (normalized.includes("SECONDE")) {
    return fallbackLevelVisualStyles[12];
  }

  if (normalized.includes("PREMIERE") || normalized.includes("PREMIÈRE")) {
    return fallbackLevelVisualStyles[13];
  }

  if (normalized.includes("TERMINALE")) {
    return fallbackLevelVisualStyles[14];
  }

  return fallbackLevelVisualStyles[fallbackIndex % fallbackLevelVisualStyles.length];
};
