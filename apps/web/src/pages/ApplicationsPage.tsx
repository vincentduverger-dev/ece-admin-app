import { useDeferredValue, useEffect, useState } from "react";

import { getApplications, getSchoolYears } from "../lib/api";
import type {
  ApplicationFilterParams,
  ApplicationListItem,
  ApplicationStatus,
  SchoolYearSummary
} from "../types/application";

type FilterState = {
  status: "" | ApplicationStatus;
  schoolYearId: string;
  search: string;
};

type StatusOption = {
  value: "" | ApplicationStatus;
  label: string;
};

const statusOptions: StatusOption[] = [
  { value: "", label: "Tous les statuts" },
  { value: "RECEIVED", label: "Reçues" },
  { value: "IN_REVIEW", label: "En revue" },
  { value: "ACCEPTED", label: "Acceptées" },
  { value: "REFUSED", label: "Refusées" }
];

const statusLabels: Record<ApplicationStatus, string> = {
  RECEIVED: "Reçue",
  IN_REVIEW: "En revue",
  ACCEPTED: "Acceptée",
  REFUSED: "Refusée"
};

const statusStyles: Record<ApplicationStatus, string> = {
  RECEIVED: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_REVIEW: "bg-info/15 text-info ring-info/20",
  ACCEPTED: "bg-success/15 text-success ring-success/20",
  REFUSED: "bg-danger/15 text-danger ring-danger/20"
};

const createdAtFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
});

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const getFamilyDisplayName = (application: ApplicationListItem): string => {
  const familyNames = [
    application.family.fatherLastName,
    application.family.motherLastName
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (familyNames.length > 0) {
    return Array.from(new Set(familyNames)).join(" / ");
  }

  const studentLastNames = application.students
    .map((student) => student.lastName.trim())
    .filter((value) => value.length > 0);

  if (studentLastNames.length > 0) {
    return Array.from(new Set(studentLastNames)).join(" / ");
  }

  if (application.family.contactEmail) {
    return application.family.contactEmail;
  }

  return "Famille non renseignée";
};

const LoadingState = () => {
  return (
    <section className="space-y-4" aria-live="polite" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-3xl border border-white/70 bg-white/70"
        />
      ))}
    </section>
  );
};

const ErrorState = ({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) => {
  return (
    <section className="rounded-3xl border border-danger/20 bg-white/90 p-8 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)]">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-danger">
        Erreur API
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">
        Impossible de charger les demandes
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
      >
        Réessayer
      </button>
    </section>
  );
};

const EmptyState = ({ hasActiveFilters }: { hasActiveFilters: boolean }) => {
  return (
    <section className="rounded-3xl border border-dashed border-border bg-white/85 p-10 text-center shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)]">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
        Aucun résultat
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">
        {hasActiveFilters
          ? "Aucune demande ne correspond aux filtres"
          : "Aucune demande n'est disponible"}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {hasActiveFilters
          ? "Essayez un autre statut, une autre année scolaire ou élargissez la recherche."
          : "La liste se remplira automatiquement dès qu'une demande sera présente en base."}
      </p>
    </section>
  );
};

const ApplicationsPage = () => {
  const [filters, setFilters] = useState<FilterState>({
    status: "",
    schoolYearId: "",
    search: ""
  });
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [schoolYearsError, setSchoolYearsError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSchoolYearsLoading, setIsSchoolYearsLoading] = useState(true);
  const deferredSearch = useDeferredValue(filters.search);

  const hasActiveFilters =
    filters.status !== "" ||
    filters.schoolYearId !== "" ||
    filters.search.trim().length > 0;

  const loadApplications = async (signal?: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: ApplicationFilterParams = {};
      const normalizedSearch = deferredSearch.trim();

      if (filters.status) {
        params.status = filters.status;
      }

      if (filters.schoolYearId) {
        params.schoolYearId = filters.schoolYearId;
      }

      if (normalizedSearch) {
        params.search = normalizedSearch;
      }

      const data = await getApplications(params, { signal });

      if (signal?.aborted) {
        return;
      }

      setApplications(data);
    } catch (loadError) {
      if (isAbortError(loadError) || signal?.aborted) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Une erreur inattendue est survenue."
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    void loadApplications(controller.signal);

    return () => {
      controller.abort();
    };
  }, [filters.status, filters.schoolYearId, deferredSearch]);

  useEffect(() => {
    const controller = new AbortController();

    const loadSchoolYears = async (): Promise<void> => {
      setIsSchoolYearsLoading(true);
      setSchoolYearsError(null);

      try {
        const data = await getSchoolYears({ signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        setSchoolYears(data);
      } catch (loadError) {
        if (isAbortError(loadError) || controller.signal.aborted) {
          return;
        }

        setSchoolYears([]);
        setSchoolYearsError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les années scolaires."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSchoolYearsLoading(false);
        }
      }
    };

    void loadSchoolYears();

    return () => {
      controller.abort();
    };
  }, []);

  if (isLoading && !hasLoadedOnce) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <ApplicationsShell>
          <LoadingState />
        </ApplicationsShell>
      </main>
    );
  }

  if (error && applications.length === 0) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <ApplicationsShell>
          <ErrorState message={error} onRetry={() => void loadApplications()} />
        </ApplicationsShell>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <ApplicationsShell>
        <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Filtres
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Rechercher et segmenter les demandes
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primaryDark">
                {isLoading
                  ? "Actualisation en cours..."
                  : `${applications.length} demande${applications.length > 1 ? "s" : ""}`}
              </div>
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    status: "",
                    schoolYearId: "",
                    search: ""
                  })
                }
                disabled={!hasActiveFilters}
                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[220px_260px_minmax(0,1fr)]">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Statut</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    status: event.target.value as FilterState["status"]
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {statusOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Année scolaire</span>
              <select
                value={filters.schoolYearId}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    schoolYearId: event.target.value
                  }))
                }
                disabled={isSchoolYearsLoading}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-wait disabled:bg-slate-50"
              >
                <option value="">
                  {isSchoolYearsLoading
                    ? "Chargement des années..."
                    : "Toutes les années scolaires"}
                </option>
                {schoolYears.map((schoolYear) => (
                  <option key={schoolYear.id} value={schoolYear.id}>
                    {schoolYear.label}
                    {schoolYear.isActive ? " · active" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Recherche</span>
              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    search: event.target.value
                  }))
                }
                placeholder="Nom de famille, élève ou email..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>

          {schoolYearsError ? (
            <p className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-slate-700">
              Impossible de charger la liste des années scolaires. Le filtre par année
              reste indisponible tant que l&apos;API ne répond pas.
            </p>
          ) : null}

          {error && applications.length > 0 ? (
            <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-slate-700">
              Impossible d&apos;actualiser la liste avec les filtres courants. Les
              derniers résultats chargés restent affichés.
            </p>
          ) : null}
        </section>

        <section className="mt-6 space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primaryDark">
              Mise à jour des demandes en cours...
            </div>
          ) : null}

          {!isLoading && applications.length === 0 ? (
            <EmptyState hasActiveFilters={hasActiveFilters} />
          ) : null}

          {applications.map((application) => (
            <article
              key={application.id}
              className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-slate-900">
                      Famille {getFamilyDisplayName(application)}
                    </h2>
                    {application.isPriority ? (
                      <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondaryDark">
                        Prioritaire
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${statusStyles[application.status]}`}
                    >
                      {statusLabels[application.status]}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Contact : {application.family.contactEmail ?? "non renseigné"}
                  </p>
                </div>

                <a
                  href={`/applications/${application.id}`}
                  className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Voir le détail
                </a>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Année scolaire
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {application.schoolYear.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {application.schoolYear.isActive ? "Année active" : "Historique"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Création
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {createdAtFormatter.format(new Date(application.createdAt))}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {application.students.length} élève
                    {application.students.length > 1 ? "s" : ""} rattaché
                    {application.students.length > 1 ? "s" : ""}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Recherche rapide
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {application.students.length > 0
                      ? application.students
                          .map((student) => `${student.firstName} ${student.lastName}`)
                          .join(" · ")
                      : "Aucun élève"}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Élèves
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {application.students.length === 0 ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                      Aucun élève rattaché
                    </span>
                  ) : (
                    application.students.map((student) => (
                      <span
                        key={student.id}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                      >
                        {student.firstName} {student.lastName} · {student.level.code}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      </ApplicationsShell>
    </main>
  );
};

const ApplicationsShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative mx-auto max-w-7xl">
      <div className="absolute inset-x-0 top-0 -z-10 h-56 rounded-[2rem] bg-gradient-to-r from-secondary/15 via-white/30 to-primary/10 blur-3xl" />
      <header className="mb-8 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
        <div className="flex flex-wrap gap-2">
          <a
            href="/"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primaryDark"
          >
            Dashboard
          </a>
          <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
            Demandes
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
              Applications
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Liste des demandes d&apos;inscription
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Première version branchée sur l&apos;API réelle pour filtrer, parcourir
              et préqualifier les dossiers avant l&apos;écran de détail.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primaryDark">
            Source : <span className="font-semibold">GET /api/applications</span>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
};

export default ApplicationsPage;
