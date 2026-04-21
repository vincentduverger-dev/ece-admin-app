import { useEffect } from "react";

import { useAuth } from "../hooks/useAuth";

const LoginPage = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      window.location.replace("/");
    }
  }, [isAuthenticated, isLoadingAuth]);

  if (isLoadingAuth) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
            Authentification
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Chargement
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Vérification de votre session...
          </p>
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
            Authentification
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Session active
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Redirection vers le dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
          Authentification
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Login page
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Cette page de connexion est un placeholder temporaire. La vraie page
          login sera branchée dans l&apos;étape suivante.
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
