import { BRANDING } from "../../config/branding";

const SiteFooter = () => {
  return (
    <footer className="flex min-h-[84px] items-center justify-center border-t border-white/60 px-6 py-4 text-center text-[1.05rem] text-slate-600 sm:text-[1.12rem]">
      © {BRANDING.schoolName}
    </footer>
  );
};

export default SiteFooter;
