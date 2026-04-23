import type { JSX } from "react";

export type PersonAvatarVariant = "boy" | "girl" | "neutral" | "man" | "woman";

type PersonAvatarSize = "sm" | "md" | "lg";
type FamilyAvatarSize = "md" | "lg";

type PersonAvatarProps = {
  label: string;
  size?: PersonAvatarSize;
  variant?: PersonAvatarVariant;
};

type FamilyAvatarProps = {
  label: string;
  size?: FamilyAvatarSize;
};

type AvatarPalette = {
  backgroundClassName: string;
  hair: string;
  shirt: string;
  skin: string;
};

const sizeClassNames: Record<PersonAvatarSize, string> = {
  sm: "h-11 w-11",
  md: "h-14 w-14",
  lg: "h-16 w-16"
};

const familyAvatarSizeClassNames: Record<FamilyAvatarSize, string> = {
  md: "h-16 w-16",
  lg: "h-20 w-20"
};

const avatarPalettes: Record<PersonAvatarVariant, AvatarPalette> = {
  boy: {
    backgroundClassName: "bg-info/10 ring-info/20",
    hair: "#334155",
    shirt: "#1F4D3A",
    skin: "#F1C9A5"
  },
  girl: {
    backgroundClassName: "bg-secondary/15 ring-secondary/25",
    hair: "#4A332E",
    shirt: "#B8842F",
    skin: "#F1C9A5"
  },
  neutral: {
    backgroundClassName: "bg-slate-100 ring-slate-200",
    hair: "#64748B",
    shirt: "#475569",
    skin: "#E9C8A6"
  },
  man: {
    backgroundClassName: "bg-primary/10 ring-primary/15",
    hair: "#334155",
    shirt: "#1F4D3A",
    skin: "#E8BE98"
  },
  woman: {
    backgroundClassName: "bg-secondary/15 ring-secondary/25",
    hair: "#4A332E",
    shirt: "#D4A24C",
    skin: "#E8BE98"
  }
};

const isLongHairVariant = (variant: PersonAvatarVariant): boolean => {
  return variant === "girl" || variant === "woman";
};

const PersonAvatar = ({
  label,
  size = "md",
  variant = "neutral"
}: PersonAvatarProps): JSX.Element => {
  const palette = avatarPalettes[variant];
  const hasLongHair = isLongHairVariant(variant);

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ${sizeClassNames[size]} ${palette.backgroundClassName}`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <circle cx="32" cy="32" r="31" fill="currentColor" className="text-white/55" />
        {hasLongHair ? (
          <path
            d="M17.5 33.2c0-13.5 5.7-22.2 14.6-22.2s14.4 8.7 14.4 22.2v13.9h-29V33.2Z"
            fill={palette.hair}
          />
        ) : (
          <path
            d="M18.5 28.8c.9-11 7.3-17.7 17.8-16.2 6.9 1 10.9 6.4 10.2 15.5-4.6-3.1-8.4-4.3-14.4-4.3-5.6 0-9.7 1.4-13.6 5Z"
            fill={palette.hair}
          />
        )}
        <path
          d="M13.4 57.5c2.6-11.3 9.6-17.1 18.6-17.1s16 5.8 18.6 17.1H13.4Z"
          fill={palette.shirt}
        />
        <circle cx="32" cy="29.5" r="12.6" fill={palette.skin} />
        {hasLongHair ? (
          <>
            <path
              d="M20.5 30.3c2.1-8 7.4-12.5 14.4-12.5 4.4 0 8 1.9 10.6 5.3-.8-7.1-5.7-12.1-13.4-12.1-8.9 0-14.6 8.7-14.6 22.2v2.6c.8-1.8 1.8-3.6 3-5.5Z"
              fill={palette.hair}
            />
            <path d="M43.8 27.1c-5.7-.4-10.3-2.5-13.9-6.3-2.3 3.8-5.3 6-9 6.8 1.5-6.2 5.9-10.6 12-10.6 5.2 0 9.1 3.1 10.9 10.1Z" fill={palette.hair} />
          </>
        ) : (
          <path
            d="M20.4 26.8c3.9-5.4 8.5-7.7 14-7.3 4.4.3 8 2.4 10.7 6.5-4.2-2-8.2-3-12.2-3-5.4 0-9.6 1.2-12.5 3.8Z"
            fill={palette.hair}
          />
        )}
        <circle cx="27.5" cy="31.3" r="1.45" fill="#172033" />
        <circle cx="36.5" cy="31.3" r="1.45" fill="#172033" />
        <path
          d="M27.8 36.9c2.5 2 5.9 2 8.4 0"
          fill="none"
          stroke="#172033"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    </span>
  );
};

export const FamilyAvatar = ({
  label,
  size = "lg"
}: FamilyAvatarProps): JSX.Element => {
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/15 ${familyAvatarSizeClassNames[size]}`}
    >
      <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden="true">
        <circle cx="40" cy="40" r="39" fill="currentColor" className="text-white/60" />
        <circle cx="25.5" cy="37.5" r="10.5" fill="#F1C9A5" />
        <path
          d="M15.4 39.2c1.3-9.4 6.6-14.3 14.1-12.9 5 .9 7.5 4.7 7.1 11.3-3.8-2.3-7-3.1-11.1-3.1-4.1 0-7.4 1.2-10.1 4.7Z"
          fill="#334155"
        />
        <path
          d="M8.9 73.4c2.2-12.7 8.5-19.1 16.6-19.1s14.4 6.4 16.6 19.1H8.9Z"
          fill="#2F6B52"
        />
        <circle cx="54.5" cy="37.5" r="10.5" fill="#E8BE98" />
        <path
          d="M43.8 39.2c1.5-9 6.9-14.2 14.4-12.8 4.9 1 7.5 5.1 7 11.2-3.7-2.3-6.7-3.2-10.7-3.2-4.2 0-7.8 1.2-10.7 4.8Z"
          fill="#4A332E"
        />
        <path
          d="M37.9 73.4c2.2-12.7 8.5-19.1 16.6-19.1s14.4 6.4 16.6 19.1H37.9Z"
          fill="#D4A24C"
        />
        <circle cx="40" cy="32.5" r="13.5" fill="#F1C9A5" />
        <path
          d="M25.5 31.9c2.3-10.2 8.5-16.1 17.7-14.6 6.3 1 9.9 5.8 9.4 14.2-4.5-2.8-8.6-4-13-4-5.6 0-10 1.4-14.1 4.4Z"
          fill="#334155"
        />
        <path
          d="M18.2 73.4c2.7-15.2 10.9-22.9 21.8-22.9s19.1 7.7 21.8 22.9H18.2Z"
          fill="#1F4D3A"
        />
        <circle cx="35.2" cy="34.6" r="1.5" fill="#172033" />
        <circle cx="44.8" cy="34.6" r="1.5" fill="#172033" />
        <path
          d="M35.9 40.6c2.5 1.9 5.7 1.9 8.2 0"
          fill="none"
          stroke="#172033"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    </span>
  );
};

export default PersonAvatar;
