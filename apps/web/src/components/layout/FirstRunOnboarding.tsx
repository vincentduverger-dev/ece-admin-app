import { useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { BRANDING } from "../../config/branding";
import { getSchoolYears } from "../../lib/api";

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const getSchoolYearsLoadErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Impossible de charger les années scolaires pour le moment.";
};

const FirstRunOnboarding = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [hasSchoolYears, setHasSchoolYears] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOnImportSetupPage = pathname === "/imports" || pathname === "/imports/new";
  const shouldShowErrorBanner = checkedPath === pathname && errorMessage !== null;
  const shouldShowModal =
    checkedPath === pathname &&
    errorMessage === null &&
    !hasSchoolYears &&
    !isOnImportSetupPage;

  useEffect(() => {
    const controller = new AbortController();

    setCheckedPath(null);
    setErrorMessage(null);

    const loadSchoolYears = async (): Promise<void> => {
      try {
        const schoolYears = await getSchoolYears({ signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        setHasSchoolYears(schoolYears.length > 0);
      } catch (loadError) {
        if (isAbortError(loadError) || controller.signal.aborted) {
          return;
        }

        setHasSchoolYears(true);
        setErrorMessage(getSchoolYearsLoadErrorMessage(loadError));
      } finally {
        if (!controller.signal.aborted) {
          setCheckedPath(pathname);
        }
      }
    };

    void loadSchoolYears();

    return () => {
      controller.abort();
    };
  }, [pathname]);

  useEffect(() => {
    if (!shouldShowModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldShowModal]);

  return (
    <>
      {shouldShowErrorBanner ? (
        <div className="pointer-events-none fixed inset-x-4 top-[144px] z-[65] flex justify-center sm:top-[156px]">
          <section
            role="alert"
            className="pointer-events-auto w-full max-w-3xl rounded-[28px] border border-danger/20 bg-white/95 px-5 py-5 text-slate-900 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.34)] backdrop-blur sm:px-6"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-danger">
              Initialisation
            </p>
            <h2 className="mt-2 font-serif text-[1.9rem] leading-tight text-slate-900">
              Vérification des années scolaires indisponible
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Impossible de vérifier si une année scolaire existe déjà. {errorMessage}
            </p>
          </section>
        </div>
      ) : null}

      {shouldShowModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(15,23,42,0.34)] px-4 backdrop-blur-[4px]">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="first-run-onboarding-title"
            aria-describedby="first-run-onboarding-description"
            className="w-full max-w-2xl rounded-[32px] border border-[#efe4d6] bg-[#fcfaf5] px-6 py-7 text-slate-950 shadow-[0_28px_70px_-36px_rgba(15,23,42,0.42)] sm:px-8 sm:py-9"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primaryDark">
              Premier démarrage
            </p>
            <h2
              id="first-run-onboarding-title"
              className="mt-3 font-serif text-[2.3rem] leading-tight text-slate-950 sm:text-[2.7rem]"
            >
              Configurez votre première année scolaire
            </h2>
            <div
              id="first-run-onboarding-description"
              className="mt-5 space-y-3 text-base leading-8 text-slate-800 sm:text-[1.02rem]"
            >
              <p>
                Bienvenue dans l&apos;application {BRANDING.schoolName} de gestion
                des inscriptions.
              </p>
              <p>
                Pour commencer, veuillez créer une année scolaire avant
                d&apos;importer les demandes.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-700">
                Cette étape est nécessaire avant le premier import des demandes.
              </p>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  navigate("/imports/new");
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-secondary px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_28px_-18px_rgba(212,162,76,0.98)] transition hover:bg-secondaryDark"
              >
                Créer une campagne d&apos;inscription
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
};

export default FirstRunOnboarding;
