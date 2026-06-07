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

const sizeClassNames: Record<PersonAvatarSize, string> = {
  sm: "h-11 w-11",
  md: "h-14 w-14",
  lg: "h-16 w-16"
};

const familyAvatarSizeClassNames: Record<FamilyAvatarSize, string> = {
  md: "h-16 w-16",
  lg: "h-20 w-20"
};

const avatarClassNames: Record<PersonAvatarVariant, string> = {
  boy: "bg-info/10 ring-info/20",
  girl: "bg-secondary/15 ring-secondary/25",
  neutral: "bg-slate-100 ring-slate-200",
  man: "bg-primary/10 ring-primary/15",
  woman: "bg-secondary/15 ring-secondary/25"
};

const avatarImageSources: Record<PersonAvatarVariant, string> = {
  boy: "/profil/Profil_boy.png",
  girl: "/profil/Profil-Girl.png",
  neutral: "/profil/Profil_family2.png",
  man: "/profil/Profil_Dad.png",
  woman: "/profil/Profil_mother2.png"
};

const PersonAvatar = ({
  label,
  size = "md",
  variant = "neutral"
}: PersonAvatarProps): JSX.Element => {
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ${sizeClassNames[size]} ${avatarClassNames[variant]}`}
    >
      <img
        src={avatarImageSources[variant]}
        alt=""
        className="h-[92%] w-[92%] rounded-full object-contain object-bottom"
        draggable={false}
      />
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
      <img
        src="/profil/Profil_family2.png"
        alt=""
        className="h-[88%] w-[88%] rounded-full object-contain object-center"
        draggable={false}
      />
    </span>
  );
};

export default PersonAvatar;
