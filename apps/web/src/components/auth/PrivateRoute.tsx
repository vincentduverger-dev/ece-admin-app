import { useEffect } from "react";
import type { ReactNode } from "react";

import { useAuth } from "../../hooks/useAuth";

type PrivateRouteProps = {
  children: ReactNode;
  redirectTo?: string;
};

const AuthLoadingState = () => {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
          Authentification
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Vérification de la session
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Chargement de votre session administrateur...
        </p>
      </div>
    </main>
  );
};

const RedirectingState = () => {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
          Authentification
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Redirection en cours
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Cette page est réservée à l&apos;administration. Redirection vers la
          page de connexion...
        </p>
      </div>
    </main>
  );
};

const PrivateRoute = ({
  children,
  redirectTo = "/login"
}: PrivateRouteProps) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      window.location.replace(redirectTo);
    }
  }, [isAuthenticated, isLoadingAuth, redirectTo]);

  if (isLoadingAuth) {
    return <AuthLoadingState />;
  }

  if (!isAuthenticated) {
    return <RedirectingState />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
