import type { ReactNode } from "react";

import { BRANDING } from "../../config/branding";
import SiteFooter from "../layout/SiteFooter";

const serifFontStyle = {
  fontFamily: 'Georgia, "Times New Roman", serif'
} as const;

const brandTextureStyle = {
  backgroundColor: "#1F4D3A",
  backgroundImage: [
    "linear-gradient(180deg, rgba(22,56,42,0.96), rgba(31,77,58,0.98))",
    "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.08), transparent 24%)",
    "radial-gradient(circle at 82% 4%, rgba(255,255,255,0.06), transparent 28%)",
    "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 8px)"
  ].join(", ")
} as const;

type SerifHeadingProps = {
  children: ReactNode;
  className: string;
  level?: 1 | 2;
};

export const SerifHeading = ({
  children,
  className,
  level = 1
}: SerifHeadingProps) => {
  const Tag = level === 1 ? "h1" : "h2";

  return (
    <Tag style={serifFontStyle} className={className}>
      {children}
    </Tag>
  );
};

export const BrandHeader = () => {
  return (
    <header
      className="relative overflow-hidden border-b-4 border-secondary shadow-[0_20px_55px_-35px_rgba(15,23,42,0.65)]"
      style={brandTextureStyle}
    >
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-center gap-0 px-6 py-6 sm:px-10 sm:py-7 lg:px-14 lg:py-8">
        <img
          src={BRANDING.logoPath}
          alt={`Logo ${BRANDING.schoolName}`}
          className="h-[88px] w-[88px] object-contain drop-shadow-[0_14px_24px_rgba(15,23,42,0.28)] sm:h-[104px] sm:w-[104px] lg:h-[118px] lg:w-[118px]"
        />
        <div className="min-w-0 text-white">
          <p
            style={serifFontStyle}
            className="text-[2rem] leading-none tracking-tight sm:text-[2.6rem] lg:text-[3.1rem]"
          >
            {BRANDING.schoolName}
          </p>
          <p className="mt-2 text-sm text-white/75">
            {BRANDING.appSubtitle}
          </p>
        </div>
      </div>
    </header>
  );
};

export const AuthFooter = () => {
  return <SiteFooter />;
};

export const EmailIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#48564b]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 7.5a2.25 2.25 0 0 1 2.25-2.25h12a2.25 2.25 0 0 1 2.25 2.25v9A2.25 2.25 0 0 1 18 18.75H6A2.25 2.25 0 0 1 3.75 16.5v-9Z" />
      <path d="m4.5 8.25 6.66 5.1a1.5 1.5 0 0 0 1.82 0l6.52-5.1" />
    </svg>
  );
};

export const LockIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#48564b]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.25 10.5V8.25a3.75 3.75 0 0 1 7.5 0v2.25" />
      <rect x="4.5" y="10.5" width="15" height="9" rx="2.25" />
      <path d="M12 13.5v3" />
    </svg>
  );
};

export const StatusSpinner = ({ className = "" }: { className?: string }) => {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary ${className}`.trim()}
    />
  );
};
