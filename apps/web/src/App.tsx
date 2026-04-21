import PrivateRoute from "./components/auth/PrivateRoute";
import ToastViewport from "./components/ui/ToastViewport";
import { ToastProvider } from "./context/ToastContext";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import DashboardPage from "./pages/DashboardPage";
import ImportCsvPage from "./pages/ImportCsvPage";
import LoginPage from "./pages/LoginPage";

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

const AppContent = () => {
  const pathname = normalizePathname(window.location.pathname);
  const applicationId = getApplicationDetailId(pathname);

  if (pathname === "/login") {
    return <LoginPage />;
  }

  if (pathname === "/") {
    return (
      <PrivateRoute>
        <DashboardPage />
      </PrivateRoute>
    );
  }

  if (pathname === "/applications") {
    return (
      <PrivateRoute>
        <ApplicationsPage />
      </PrivateRoute>
    );
  }

  if (pathname === "/imports" || pathname === "/imports/new") {
    return (
      <PrivateRoute>
        <ImportCsvPage />
      </PrivateRoute>
    );
  }

  if (applicationId) {
    return (
      <PrivateRoute>
        <ApplicationDetailPage applicationId={applicationId} />
      </PrivateRoute>
    );
  }

  return <NotFoundPage />;
};

function App() {
  return (
    <ToastProvider>
      <AppContent />
      <ToastViewport />
    </ToastProvider>
  );
}

export default App;
