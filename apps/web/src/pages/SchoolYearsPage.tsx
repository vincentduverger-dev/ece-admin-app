import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";

import PageSectionHeader from "../components/layout/PageSectionHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LoadingState from "../components/ui/LoadingState";
import { BRANDING } from "../config/branding";
import { useToast } from "../context/ToastContext";
import { activateSchoolYear, deleteSchoolYear, getSchoolYears } from "../lib/api";
import type { SchoolYearSummary } from "../types/application";

type BadgeTone = "active" | "history";

const getEnterStyle = (delay: number): CSSProperties => {
  return {
    "--ui-enter-delay": `${delay}ms`
  } as CSSProperties;
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const formatSchoolYearLabel = (label: string): string => {
  return label.replace(/^(\d{4})-(\d{4})$/u, "$1 - $2");
};

const createdAtFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long"
});

const getActivationErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Impossible d'activer cette année scolaire pour le moment.";
};

const getDeletionErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Impossible de supprimer cette campagne d'inscription pour le moment.";
};

const TrashIcon = ({ className = "h-4 w-4" }: { className?: string }) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.75 5.25h12.5" />
      <path d="M7.25 5.25V4a1.25 1.25 0 0 1 1.25-1.25h3a1.25 1.25 0 0 1 1.25 1.25v1.25" />
      <path d="M6.25 7.75v6.5" />
      <path d="M10 7.75v6.5" />
      <path d="M13.75 7.75v6.5" />
      <path d="M5.75 5.25l.6 9.05a1.5 1.5 0 0 0 1.5 1.4h4.3a1.5 1.5 0 0 0 1.5-1.4l.6-9.05" />
    </svg>
  );
};

const StatusBadge = ({
  label,
  tone
}: {
  label: string;
  tone: BadgeTone;
}) => {
  const className =
    tone === "active"
      ? "border-success/20 bg-success/10 text-success"
      : "border-slate-300 bg-white text-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${className}`}
    >
      {label}
    </span>
  );
};

const SchoolYearsPage = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [schoolYears, setSchoolYears] = useState<SchoolYearSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingSchoolYearId, setActivatingSchoolYearId] = useState<string | null>(null);
  const [deletingSchoolYearId, setDeletingSchoolYearId] = useState<string | null>(null);
  const [schoolYearPendingDeletion, setSchoolYearPendingDeletion] =
    useState<SchoolYearSummary | null>(null);
  const activeSchoolYear = useMemo(() => {
    return schoolYears.find((schoolYear) => schoolYear.isActive) ?? null;
  }, [schoolYears]);
  const replacementSchoolYearAfterDeletion = useMemo(() => {
    if (!schoolYearPendingDeletion?.isActive) {
      return null;
    }

    return (
      schoolYears.find((schoolYear) => schoolYear.id !== schoolYearPendingDeletion.id) ?? null
    );
  }, [schoolYearPendingDeletion, schoolYears]);

  const loadSchoolYears = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getSchoolYears({ signal });

      if (signal?.aborted) {
        return;
      }

      setSchoolYears(data);
    } catch (loadError) {
      if (isAbortError(loadError) || signal?.aborted) {
        return;
      }

      setSchoolYears([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les années scolaires."
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadSchoolYears(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadSchoolYears]);

  useEffect(() => {
    if (!schoolYearPendingDeletion) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [schoolYearPendingDeletion]);

  const handleActivateSchoolYear = async (
    schoolYearToActivate: SchoolYearSummary
  ): Promise<void> => {
    if (
      schoolYearToActivate.isActive ||
      activatingSchoolYearId !== null ||
      deletingSchoolYearId !== null
    ) {
      return;
    }

    setActivatingSchoolYearId(schoolYearToActivate.id);

    try {
      const activatedSchoolYear = await activateSchoolYear(schoolYearToActivate.id);

      setSchoolYears((currentSchoolYears) =>
        currentSchoolYears.map((schoolYear) => ({
          ...schoolYear,
          isActive: schoolYear.id === activatedSchoolYear.id
        }))
      );
      showSuccess(
        `Année scolaire ${formatSchoolYearLabel(activatedSchoolYear.label)} activée.`
      );
    } catch (activationError) {
      showError(getActivationErrorMessage(activationError));
    } finally {
      setActivatingSchoolYearId(null);
    }
  };

  const handleRequestDeleteSchoolYear = (schoolYear: SchoolYearSummary): void => {
    if (activatingSchoolYearId !== null || deletingSchoolYearId !== null) {
      return;
    }

    setSchoolYearPendingDeletion(schoolYear);
  };

  const handleCancelDeletion = (): void => {
    if (deletingSchoolYearId !== null) {
      return;
    }

    setSchoolYearPendingDeletion(null);
  };

  const handleConfirmDeletion = async (): Promise<void> => {
    if (!schoolYearPendingDeletion || deletingSchoolYearId !== null) {
      return;
    }

    const schoolYearToDelete = schoolYearPendingDeletion;

    setDeletingSchoolYearId(schoolYearToDelete.id);

    try {
      const deletionResult = await deleteSchoolYear(schoolYearToDelete.id);

      setSchoolYears((currentSchoolYears) =>
        currentSchoolYears
          .filter((schoolYear) => schoolYear.id !== schoolYearToDelete.id)
          .map((schoolYear) => ({
            ...schoolYear,
            isActive: schoolYearToDelete.isActive
              ? schoolYear.id === deletionResult.activatedSchoolYearId
              : schoolYear.isActive
          }))
      );
      setSchoolYearPendingDeletion(null);

      if (schoolYearToDelete.isActive && deletionResult.activatedSchoolYearId) {
        const nextActiveSchoolYear = schoolYears.find(
          (schoolYear) => schoolYear.id === deletionResult.activatedSchoolYearId
        );

        if (nextActiveSchoolYear) {
          showSuccess(
            `Campagne ${formatSchoolYearLabel(schoolYearToDelete.label)} supprimée. ${formatSchoolYearLabel(nextActiveSchoolYear.label)} est désormais active.`
          );

          return;
        }
      }

      showSuccess(
        `Campagne ${formatSchoolYearLabel(schoolYearToDelete.label)} supprimée.`
      );
    } catch (deletionError) {
      showError(getDeletionErrorMessage(deletionError));
    } finally {
      setDeletingSchoolYearId(null);
    }
  };

  const pageTopBar = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="w-fit rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]">
        <Breadcrumb
          items={[
            { label: "Tableau de bord", href: "/" },
            { label: "Années scolaires" }
          ]}
        />
      </div>
    </div>
  );

  const pageHeaderAside = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[24px] border border-primary/10 bg-white/82 px-4 py-4 text-center text-sm text-primaryDark shadow-[0_14px_28px_-24px_rgba(15,23,42,0.22)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primaryLight">
          Campagnes créées
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {isLoading ? "..." : schoolYears.length}
        </p>
      </div>
      <div className="rounded-[24px] border border-primary/10 bg-white/82 px-4 py-4 text-center text-sm text-primaryDark shadow-[0_14px_28px_-24px_rgba(15,23,42,0.22)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primaryLight">
          Année active
        </p>
        <p className="mt-2 text-base font-semibold text-slate-900">
          {isLoading
            ? "Chargement..."
            : activeSchoolYear
              ? formatSchoolYearLabel(activeSchoolYear.label)
              : "Non configurée"}
        </p>
      </div>
    </div>
  );

  const pageHeader = (
    <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(120)}>
      <PageSectionHeader
        topBar={pageTopBar}
        eyebrow={`Administration ${BRANDING.schoolName}`}
        title="Années scolaires"
        description="Consultez les campagnes d’inscription créées et activez l’année à utiliser par défaut dans l’application."
        aside={pageHeaderAside}
      />
    </div>
  );

  if (isLoading && !hasLoadedOnce) {
    return (
      <>
        {pageHeader}
        <LoadingState variant="page" />
      </>
    );
  }

  if (error && schoolYears.length === 0) {
    return (
      <>
        {pageHeader}
        <ErrorState
          message={error}
          actionLabel="Réessayer"
          onAction={() => void loadSchoolYears()}
          backLink="/"
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {pageHeader}

      {!isLoading && schoolYears.length === 0 ? (
        <EmptyState
          title="Aucune année scolaire n’a encore été créée."
          description="La création d'une nouvelle campagne d'inscription se fait depuis la page Campagne d'inscription."
          actionLabel="Créer une campagne d’inscription"
          onAction={() => navigate("/imports/new")}
        />
      ) : null}

      {schoolYears.length > 0 ? (
        <section
          className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)] sm:p-7"
          style={getEnterStyle(180)}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Historique
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Campagnes scolaires enregistrées
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Cette page permet de consulter les campagnes déjà créées et de
                choisir l&apos;année active utilisée par défaut. La création d&apos;une
                nouvelle campagne reste disponible depuis Campagne d&apos;inscription.
              </p>
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-sm font-medium text-secondaryDark">
              {schoolYears.length} année{schoolYears.length > 1 ? "s" : ""} scolaire
              {schoolYears.length > 1 ? "s" : ""}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {schoolYears.map((schoolYear, index) => {
              const isActivating = activatingSchoolYearId === schoolYear.id;
              const isDeleting = deletingSchoolYearId === schoolYear.id;
              const isActionLocked =
                (activatingSchoolYearId !== null &&
                  activatingSchoolYearId !== schoolYear.id) ||
                (deletingSchoolYearId !== null && deletingSchoolYearId !== schoolYear.id);

              return (
                <article
                  key={schoolYear.id}
                  className="ui-animate-in ui-surface-hover ui-surface-hover--soft rounded-[28px] border border-[#ebe1d6] bg-white/88 p-5 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.24)]"
                  style={getEnterStyle(230 + index * 45)}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-serif text-[2rem] leading-tight text-slate-900">
                          {formatSchoolYearLabel(schoolYear.label)}
                        </h3>
                        <StatusBadge
                          label={schoolYear.isActive ? "Active" : "Historique"}
                          tone={schoolYear.isActive ? "active" : "history"}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Créée le {createdAtFormatter.format(new Date(schoolYear.createdAt))}
                      </p>
                    </div>

                    <div className="inline-flex w-fit flex-col rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primaryDark">
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                        Statut
                      </span>
                      <span className="mt-1 font-semibold">
                        {schoolYear.isActive
                          ? "Utilisée par défaut"
                          : "Disponible à l'activation"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      to={`/applications?schoolYearId=${encodeURIComponent(schoolYear.id)}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary"
                    >
                      Voir les demandes
                    </Link>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteSchoolYear(schoolYear)}
                        disabled={isDeleting || isActionLocked}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 px-5 py-3 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <TrashIcon />
                        {isDeleting ? "Suppression..." : "Supprimer"}
                      </button>

                      {schoolYear.isActive ? (
                        <span className="inline-flex items-center justify-center rounded-2xl bg-success/10 px-5 py-3 text-sm font-semibold text-success">
                          Année active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleActivateSchoolYear(schoolYear)}
                          disabled={isActivating || isActionLocked}
                          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-wait disabled:bg-slate-300"
                        >
                          {isActivating ? "Activation..." : "Activer"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {schoolYearPendingDeletion ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(15,23,42,0.4)] px-4 backdrop-blur-[4px]">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-school-year-title"
            aria-describedby="delete-school-year-description"
            className="w-full max-w-2xl rounded-[32px] border border-[#f0dfd8] bg-[#fffaf7] px-6 py-7 text-slate-950 shadow-[0_28px_70px_-36px_rgba(15,23,42,0.42)] sm:px-8 sm:py-8"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-danger">
              Suppression de campagne
            </p>
            <h2
              id="delete-school-year-title"
              className="mt-3 font-serif text-[2rem] leading-tight text-slate-950 sm:text-[2.35rem]"
            >
              Supprimer la campagne {formatSchoolYearLabel(schoolYearPendingDeletion.label)} ?
            </h2>
            <div
              id="delete-school-year-description"
              className="mt-5 space-y-3 text-base leading-8 text-slate-800"
            >
              <p>
                Cette action supprimera en base l&apos;année scolaire, les demandes
                rattachées, les élèves importés et l&apos;historique d&apos;import
                associés à cette campagne.
              </p>
              <p>Cette suppression est définitive et ne pourra pas être annulée.</p>
              {schoolYearPendingDeletion.isActive ? (
                replacementSchoolYearAfterDeletion ? (
                  <p>
                    Après suppression, l&apos;année{" "}
                    {formatSchoolYearLabel(replacementSchoolYearAfterDeletion.label)} sera
                    automatiquement activée.
                  </p>
                ) : (
                  <p>
                    Après suppression, aucune année scolaire ne restera active dans
                    l&apos;application.
                  </p>
                )
              ) : null}
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleCancelDeletion}
                disabled={deletingSchoolYearId !== null}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                Annuler
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => void handleConfirmDeletion()}
                disabled={deletingSchoolYearId !== null}
                className="inline-flex items-center justify-center rounded-2xl bg-danger px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c43d44] disabled:cursor-wait disabled:bg-slate-300"
              >
                {deletingSchoolYearId !== null
                  ? "Suppression en cours..."
                  : "Supprimer la campagne"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default SchoolYearsPage;
