import ApplicationsPage from "./pages/ApplicationsPage";
import DashboardPage from "./pages/DashboardPage";

const normalizePathname = (pathname: string): string => {
  const normalizedPathname = pathname.replace(/\/+$/, "");

  return normalizedPathname.length > 0 ? normalizedPathname : "/";
};

const decodePathSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getApplicationDetailId = (pathname: string): string | null => {
  const match = pathname.match(/^\/applications\/([^/]+)$/);

  if (!match) {
    return null;
  }

  return decodePathSegment(match[1]);
};

const ApplicationDetailPlaceholderPage = ({
  applicationId
}: {
  applicationId: string;
}) => {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-5xl">
        <div className="absolute inset-x-0 top-0 -z-10 h-56 rounded-[2rem] bg-gradient-to-r from-secondary/15 via-white/30 to-primary/10 blur-3xl" />

        <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap gap-2">
            <a
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primaryDark"
            >
              Dashboard
            </a>
            <a
              href="/applications"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primaryDark"
            >
              Demandes
            </a>
            <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              Détail
            </span>
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
            Détail Demande
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Page détail à finaliser
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Le backend expose déjà <span className="font-semibold">GET /api/applications/:id</span>.
            Cette route frontend sert pour l&apos;instant de point d&apos;entrée depuis
            la liste en attendant la fiche complète.
          </p>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Identifiant ciblé
            </p>
            <p className="mt-2 break-all text-lg font-semibold text-slate-900">
              {applicationId}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/applications"
              className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark"
            >
              Retour à la liste
            </a>
            <a
              href="/"
              className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Retour au dashboard
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};

const NotFoundPage = () => {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
          Navigation
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Page introuvable
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Cette route frontend n&apos;est pas encore gérée dans cette première
          version.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark"
          >
            Aller au dashboard
          </a>
          <a
            href="/applications"
            className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Ouvrir les demandes
          </a>
        </div>
      </div>
    </main>
  );
};

function App() {
  const pathname = normalizePathname(window.location.pathname);
  const applicationId = getApplicationDetailId(pathname);

  if (pathname === "/") {
    return <DashboardPage />;
  }

  if (pathname === "/applications") {
    return <ApplicationsPage />;
  }

  if (applicationId) {
    return <ApplicationDetailPlaceholderPage applicationId={applicationId} />;
  }

  return <NotFoundPage />;
}

export default App;
