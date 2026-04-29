import { Link, Navigate, Route, Routes } from "react-router-dom";

import PrivateRoute from "./components/auth/PrivateRoute";
import AppLayout from "./components/layout/AppLayout";
import ToastViewport from "./components/ui/ToastViewport";
import { ToastProvider } from "./context/ToastContext";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import ApplicationEmailPage from "./pages/ApplicationEmailPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import DashboardPage from "./pages/DashboardPage";
import ImportCsvPage from "./pages/ImportCsvPage";
import LoginPage from "./pages/LoginPage";
import SchoolYearsPage from "./pages/SchoolYearsPage";
import StudentsPage from "./pages/StudentsPage";

const NotFoundPage = () => {
  return (
    <main className="app-background-texture min-h-screen px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
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
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark"
          >
            Aller au dashboard
          </Link>
          <Link
            to="/applications"
            className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Ouvrir les demandes
          </Link>
        </div>
      </div>
    </main>
  );
};

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="applications/:id/email" element={<ApplicationEmailPage />} />
            <Route path="applications/:id" element={<ApplicationDetailPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="imports">
              <Route index element={<Navigate to="new" replace />} />
              <Route path="new" element={<ImportCsvPage />} />
            </Route>
            <Route path="school-years" element={<SchoolYearsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ToastViewport />
    </ToastProvider>
  );
}

export default App;
