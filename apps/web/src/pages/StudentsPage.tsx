import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties
} from "react";
import { Link, useSearchParams } from "react-router-dom";

import PageSectionHeader from "../components/layout/PageSectionHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LevelBadge from "../components/ui/LevelBadge";
import LoadingState from "../components/ui/LoadingState";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { getActiveSchoolYear, getApplications, getLevels } from "../lib/api";
import type {
  ApplicationListItem,
  ApplicationStudent,
  LevelSummary,
  SchoolYearSummary
} from "../types/application";

type StudentListItem = {
  application: ApplicationListItem;
  student: ApplicationStudent;
};

type PageSize = 6 | 8 | 10 | 12;

type IconProps = {
  className?: string;
};

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const pageSizeOptions: PageSize[] = [6, 8, 10, 12];

const getEnterStyle = (delay: number): CSSProperties => {
  return {
    "--ui-enter-delay": `${delay}ms`
  } as CSSProperties;
};

const formatSchoolYearLabel = (label: string): string => {
  return label.replace(/^(\d{4})-(\d{4})$/u, "$1 - $2");
};

const normalizeLevelCode = (value: string): string => {
  return value.trim().toUpperCase();
};

const getPaginationItems = (
  currentPage: number,
  totalPages: number
): PaginationItem[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 2) {
    endPage = 4;
  }

  if (currentPage >= totalPages - 1) {
    startPage = totalPages - 3;
  }

  if (startPage > 2) {
    items.push("ellipsis-left");
  }

  for (let page = startPage; page <= endPage; page += 1) {
    items.push(page);
  }

  if (endPage < totalPages - 1) {
    items.push("ellipsis-right");
  }

  items.push(totalPages);

  return items;
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

  return application.family.contactEmail ?? "Famille non renseignée";
};

const ChevronRightIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6.25 3.25 4.5 4.75-4.5 4.75" />
    </svg>
  );
};

const ChevronLeftIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9.75 3.25-4.5 4.75 4.5 4.75" />
    </svg>
  );
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const PaginationControls = memo(function PaginationControls({
  currentPage,
  totalPages,
  onPageChange
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const paginationItems = getPaginationItems(currentPage, totalPages);
  const baseButtonClassName =
    "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mt-6 flex justify-center border-t border-slate-200/80 pt-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={baseButtonClassName}
        >
          <ChevronLeftIcon />
          <span>Précédent</span>
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          {paginationItems.map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === currentPage ? "page" : undefined}
                className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full border px-3 text-sm font-semibold transition ${
                  item === currentPage
                    ? "border-primary bg-primary text-white shadow-[0_14px_26px_-20px_rgba(31,77,58,0.55)]"
                    : "border-slate-300 bg-white text-slate-700 hover:border-primary/25 hover:text-primary"
                }`}
              >
                {item}
              </button>
            ) : (
              <span
                key={item}
                className="inline-flex h-10 min-w-[2.5rem] items-center justify-center text-sm font-semibold text-slate-400"
              >
                ...
              </span>
            )
          )}
        </div>

        <span className="min-w-[96px] text-center text-sm font-medium text-slate-600 sm:hidden">
          Page {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={baseButtonClassName}
        >
          <span>Suivant</span>
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
});

const StudentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLevel = normalizeLevelCode(searchParams.get("level") ?? "");
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYearSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(8);

  const selectedLevel = useMemo(() => {
    return levels.find((level) => normalizeLevelCode(level.code) === requestedLevel) ?? null;
  }, [levels, requestedLevel]);

  const studentRows = useMemo<StudentListItem[]>(() => {
    if (!requestedLevel) {
      return [];
    }

    return applications.flatMap((application) =>
      application.students
        .filter((student) => normalizeLevelCode(student.level.code) === requestedLevel)
        .map((student) => ({ application, student }))
    );
  }, [applications, requestedLevel]);

  const studentsCountLabel = `${studentRows.length} élève${studentRows.length > 1 ? "s" : ""}`;
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(studentRows.length / pageSize));
  }, [pageSize, studentRows.length]);
  const resolvedCurrentPage = Math.min(currentPage, totalPages);
  const currentPageStudentRows = useMemo(() => {
    const startIndex = (resolvedCurrentPage - 1) * pageSize;

    return studentRows.slice(startIndex, startIndex + pageSize);
  }, [pageSize, resolvedCurrentPage, studentRows]);
  const visibleStart = studentRows.length === 0
    ? 0
    : (resolvedCurrentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(resolvedCurrentPage * pageSize, studentRows.length);
  const selectedLevelLabel = selectedLevel?.label ?? requestedLevel;
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.28)] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

  const handleLevelChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const nextLevel = normalizeLevelCode(event.target.value);
      const nextParams = new URLSearchParams(searchParams);

      if (nextLevel) {
        nextParams.set("level", nextLevel);
      } else {
        nextParams.delete("level");
      }

      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams]
  );

  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setPageSize(Number(event.target.value) as PageSize);
    },
    []
  );

  const handlePageChange = useCallback(
    (page: number): void => {
      setCurrentPage(Math.min(totalPages, Math.max(1, page)));
    },
    [totalPages]
  );

  const loadStudentsContext = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedLevels, currentSchoolYear] = await Promise.all([
        getLevels({ signal }),
        getActiveSchoolYear({ signal }).catch(() => null)
      ]);

      if (signal?.aborted) {
        return;
      }

      const loadedApplications = await getApplications(
        currentSchoolYear ? { schoolYearId: currentSchoolYear.id } : {},
        { signal }
      );

      if (signal?.aborted) {
        return;
      }

      setLevels(loadedLevels);
      setActiveSchoolYear(currentSchoolYear);
      setApplications(loadedApplications);
    } catch (loadError) {
      if (isAbortError(loadError) || signal?.aborted) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger la liste des élèves."
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

    void loadStudentsContext(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadStudentsContext]);

  useEffect(() => {
    setCurrentPage(1);
  }, [requestedLevel, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pageTopBar = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div
        className="ui-animate-in ui-animate-in--subtle w-fit rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]"
        style={getEnterStyle(20)}
      >
        <Breadcrumb
          items={[
            { label: "Tableau de bord", href: "/" },
            { label: "Élèves par niveau" }
          ]}
        />
      </div>

      <div className="flex lg:justify-end">
        <div
          className="ui-animate-in ui-animate-in--subtle rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-center text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]"
          style={getEnterStyle(90)}
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primaryLight">
            Année active
          </p>
          <p className="mt-1 font-semibold">
            {activeSchoolYear ? formatSchoolYearLabel(activeSchoolYear.label) : "Toutes les années"}
          </p>
        </div>
      </div>
    </div>
  );

  const pageHeader = (
    <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(130)}>
      <PageSectionHeader
        topBar={pageTopBar}
        eyebrow="Élèves"
        title="Élèves par niveau demandé"
        description="Retrouvez rapidement les élèves associés au niveau sélectionné depuis le tableau de bord."
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

  if (error && applications.length === 0) {
    return (
      <>
        {pageHeader}
        <ErrorState
          message={error}
          actionLabel="Réessayer"
          onAction={() => void loadStudentsContext()}
        />
      </>
    );
  }

  return (
    <>
      {pageHeader}

      <section
        className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)] sm:p-7"
        style={getEnterStyle(190)}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
              Filtre niveau
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {requestedLevel ? selectedLevelLabel : "Sélectionner un niveau"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Le niveau reçu dans l&apos;URL est appliqué automatiquement au chargement.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-[220px]">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Niveau
              </span>
              <select
                value={requestedLevel}
                onChange={handleLevelChange}
                className={`${inputClassName} mt-2`}
              >
                <option value="">Choisir un niveau</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.code}>
                    {level.label} · {level.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <span className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primaryDark">
              {isLoading ? "Actualisation..." : studentsCountLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {isLoading && hasLoadedOnce ? <LoadingState variant="card" /> : null}

        {error && applications.length > 0 ? (
          <ErrorState
            message={`${error} Les derniers résultats chargés restent affichés.`}
            actionLabel="Réessayer"
            onAction={() => void loadStudentsContext()}
          />
        ) : null}

        {!requestedLevel ? (
          <EmptyState
            title="Aucun niveau sélectionné"
            description="Choisissez un niveau pour afficher les élèves correspondants."
          />
        ) : null}

        {requestedLevel && !isLoading && studentRows.length === 0 ? (
          <EmptyState
            title="Aucun élève trouvé"
            description={`Aucun élève ne correspond au niveau ${selectedLevelLabel}.`}
          />
        ) : null}

        {studentRows.length > 0 ? (
          <section
            className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent overflow-hidden rounded-[32px] border border-white/80 bg-white/92 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.3)]"
            style={getEnterStyle(250)}
          >
            <div className="border-b border-slate-200/80 px-6 py-5 sm:px-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                    Résultats
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {studentsCountLabel} en {selectedLevelLabel}
                  </h2>
                </div>
                <div className="flex flex-nowrap items-center gap-2">
                  <span className="inline-flex shrink-0 items-center rounded-full border border-primary/15 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primaryDark">
                    {visibleStart}-{visibleEnd} sur {studentRows.length}
                  </span>
                  <label className="inline-flex min-w-0 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3.5 pr-1.5 text-sm font-medium text-slate-700">
                    <span className="whitespace-nowrap">Élèves par page</span>
                    <select
                      value={pageSize}
                      onChange={handlePageSizeChange}
                      className="w-[4.25rem] rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                      {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <LevelBadge
                    code={selectedLevel?.code ?? requestedLevel}
                    label={selectedLevelLabel}
                    size="md"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6">
              <div className="space-y-3">
                {currentPageStudentRows.map(({ application, student }, index) => (
                  <article
                    key={`${application.id}-${student.id}`}
                    className="group ui-animate-in ui-surface-hover ui-surface-hover--soft rounded-[28px] border border-slate-200/90 bg-slate-50/80 p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] sm:p-5"
                    style={getEnterStyle(310 + index * 45)}
                  >
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_170px_180px_108px] xl:items-center">
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Élève
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                          {student.firstName} {student.lastName}
                        </h3>
                        <div className="mt-2">
                          <LevelBadge
                            code={student.level.code}
                            label={student.level.label}
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Famille
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          Famille {getFamilyDisplayName(application)}
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-500">
                          {application.family.contactEmail ?? "Contact non renseigné"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Année
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatSchoolYearLabel(application.schoolYear.label)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Demande
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge status={application.status} />
                          <PriorityBadge isPriority={application.isPriority} />
                        </div>
                      </div>

                      <div className="xl:justify-self-end">
                        <Link
                          to={`/applications/${application.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition group-hover:border-primary/25 group-hover:text-primary hover:border-primary/25 hover:text-primary"
                        >
                          <span>Voir</span>
                          <ChevronRightIcon />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <PaginationControls
                currentPage={resolvedCurrentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </section>
        ) : null}
      </section>
    </>
  );
};

export default StudentsPage;
