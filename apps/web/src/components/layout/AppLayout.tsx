import type { CSSProperties } from "react";

import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import FirstRunOnboarding from "./FirstRunOnboarding";

type IconProps = {
  className?: string;
};

type NavigationItem = {
  key: "dashboard" | "applications" | "imports" | "schoolYears";
  label: string;
  to?: string;
  end?: boolean;
  icon: (props: IconProps) => React.JSX.Element;
};

const brandTextureStyle: CSSProperties = {
  backgroundColor: "#1F4D3A",
  backgroundImage: [
    "linear-gradient(180deg, rgba(22,56,42,0.96), rgba(31,77,58,0.98))",
    "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.08), transparent 24%)",
    "radial-gradient(circle at 82% 4%, rgba(255,255,255,0.06), transparent 28%)",
    "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 8px)"
  ].join(", ")
};

const paperTextureStyle: CSSProperties = {
  backgroundColor: "#F8F6F2",
  backgroundImage: [
    "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,243,236,0.96))",
    "radial-gradient(circle at top right, rgba(212,162,76,0.10), transparent 28%)",
    "radial-gradient(circle at bottom left, rgba(31,77,58,0.05), transparent 24%)",
    "repeating-linear-gradient(0deg, rgba(31,77,58,0.018) 0, rgba(31,77,58,0.018) 1px, transparent 1px, transparent 14px)"
  ].join(", ")
};

const desktopSidebarPositionStyle: CSSProperties = {
  left: "max(2rem, calc((100vw - 1600px) / 2 + 2rem))"
};

const DashboardIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M8 12h8M12 8v8" strokeLinecap="round" />
    </svg>
  );
};

const FolderIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3l1.6 1.8h6.4A2.5 2.5 0 0 1 20 9.3v7.2A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M7.5 12h9" strokeLinecap="round" />
    </svg>
  );
};

const UploadIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 16V7.5m0 0L8.7 10.8M12 7.5l3.3 3.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
    </svg>
  );
};

const CalendarIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" strokeLinecap="round" />
      <path d="M8.5 13h3M8.5 16.5h7" strokeLinecap="round" />
    </svg>
  );
};

const LogoutIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M10 6V4.8A1.8 1.8 0 0 1 11.8 3h5.4A1.8 1.8 0 0 1 19 4.8v14.4a1.8 1.8 0 0 1-1.8 1.8h-5.4A1.8 1.8 0 0 1 10 19.2V18" />
      <path d="M14.5 12H5.5m0 0 2.7-2.8M5.5 12l2.7 2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ChevronDownIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const navigationItems: NavigationItem[] = [
  {
    key: "dashboard",
    label: "Tableau de bord",
    to: "/",
    end: true,
    icon: DashboardIcon
  },
  {
    key: "applications",
    label: "Demandes",
    to: "/applications",
    icon: FolderIcon
  },
  {
    key: "imports",
    label: "Campagne d'inscription",
    to: "/imports/new",
    icon: UploadIcon
  },
  {
    key: "schoolYears",
    label: "Années scolaires",
    to: "/school-years",
    icon: CalendarIcon
  }
];

const SidebarLink = ({ item }: { item: NavigationItem }) => {
  const content = (
    <>
      <item.icon className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
    </>
  );

  if (!item.to) {
    return (
      <span
        aria-disabled="true"
        className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-base font-medium text-white/75"
      >
        {content}
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition ${
          isActive
            ? "bg-secondary text-white shadow-[0_14px_28px_-18px_rgba(212,162,76,0.95)]"
            : "border border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
        }`
      }
    >
      {content}
    </NavLink>
  );
};

const AppLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-slate-900">
      <FirstRunOnboarding />

      <header
        className="fixed inset-x-0 top-0 z-40 border-b-4 border-secondary shadow-[0_20px_55px_-35px_rgba(15,23,42,0.65)]"
        style={brandTextureStyle}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/logo_ece.png"
              alt="Logo ECE"
              className="h-16 w-16 rounded-full border border-white/80 bg-white/95 p-1 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.75)] sm:h-20 sm:w-20"
            />
            <div className="min-w-0 text-white">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-3xl font-semibold tracking-tight sm:text-[2.8rem]">
                  ECE
                </p>
                <p className="text-xl font-medium text-white/90 sm:text-2xl">
                  École de la Culture et de l&apos;Éducation
                </p>
              </div>
              <p className="mt-1 text-sm text-white/75">
                Interface d&apos;administration des demandes d&apos;inscription
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] sm:flex">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-lg font-semibold">
              {user?.role === "admin" ? "A" : "?"}
            </span>
            <span className="text-lg font-medium">Admin</span>
            <ChevronDownIcon className="h-4 w-4 text-white/80" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 pb-6 pt-[108px] sm:px-6 sm:pt-[124px] lg:px-8 lg:pt-[136px]">
        <div className="lg:pl-[272px]">
          <aside
            className="mb-4 overflow-hidden rounded-[30px] border border-primaryDark/10 text-white shadow-[0_24px_58px_-38px_rgba(15,23,42,0.78)] lg:fixed lg:top-[136px] lg:z-30 lg:mb-0 lg:max-h-[calc(100vh-160px)] lg:w-[248px] lg:overflow-y-auto"
            style={{
              ...brandTextureStyle,
              ...desktopSidebarPositionStyle
            }}
          >
            <div className="p-4">
              <nav className="mb-[100px] space-y-3" aria-label="Navigation principale">
                {navigationItems.map((item) => (
                  <SidebarLink key={item.key} item={item} />
                ))}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base font-medium text-white/95 transition hover:bg-white/10"
              >
                <LogoutIcon className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </aside>

          <div className="flex min-h-[calc(100vh-164px)] flex-col gap-6">
            <main
              className="overflow-hidden rounded-[34px] border border-[#e8ddd1] px-5 py-5 shadow-[0_26px_58px_-42px_rgba(15,23,42,0.28)] sm:px-6 lg:flex-1 lg:px-10 lg:py-8"
              style={paperTextureStyle}
            >
              <Outlet />
            </main>

            <footer className="py-2 text-center text-sm text-slate-500">
              © ECE - École de la Culture et de l&apos;Éducation
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
