import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
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
import PersonAvatar, {
  type PersonAvatarVariant
} from "../components/ui/PersonAvatar";
import PriorityBadge from "../components/ui/PriorityBadge";
import StudentStatusBadge from "../components/ui/StudentStatusBadge";
import {
  getActiveSchoolYear,
  getLevels,
  getSchoolYears,
  getStudents
} from "../lib/api";
import { consumePostLoginFilterDefaults } from "../lib/postLoginFilterDefaults";
import type {
  ApplicationGender,
  LevelSummary,
  SchoolYearSummary,
  StudentFilterParams,
  StudentListItem,
  VisibleStudentAdmissionStatus
} from "../types/application";

type PageSize = 4 | 6 | 8 | 10 | 12 | 15 | 18 | 20;
type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

type StudentListViewState = {
  search: string;
  status: "" | VisibleStudentAdmissionStatus;
  levelId: string;
  schoolYearId: string;
  isPriority: "" | "true";
  familyId: string;
  page: number;
  limit: PageSize;
  sortBy: NonNullable<StudentFilterParams["sortBy"]>;
  sortOrder: "asc" | "desc";
};

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const pageSizeOptions: PageSize[] = [4, 6, 8, 10, 12, 15, 18, 20];
const studentListViewStorageKey = "horizon-admin.students.listViewState.v1";
const sortableFields: Array<NonNullable<StudentFilterParams["sortBy"]>> = [
  "lastName",
  "firstName",
  "level",
  "birthDate",
  "submittedAt",
  "status"
];

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const getEnterStyle = (delay: number): CSSProperties => {
  return { "--ui-enter-delay": `${delay}ms` } as CSSProperties;
};

const formatSchoolYearLabel = (label: string): string => {
  return label.replace(/^(\d{4})-(\d{4})$/u, "$1 - $2");
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const getFamilyDisplayName = (student: StudentListItem): string => {
  const family = student.application.family;
  const familyNames = [family.fatherLastName, family.motherLastName]
    .filter((value): value is string => Boolean(value?.trim()));

  if (familyNames.length > 0) {
    return Array.from(new Set(familyNames)).join(" / ");
  }

  return student.lastName || family.contactEmail || "Famille non renseignée";
};

const getStudentCountLabel = (count: number): string => {
  return `${count} élève${count > 1 ? "s" : ""}`;
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

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
    items.push(pageNumber);
  }

  if (endPage < totalPages - 1) {
    items.push("ellipsis-right");
  }

  items.push(totalPages);

  return items;
};

const getStudentAvatarVariant = (
  gender: ApplicationGender
): PersonAvatarVariant => {
  if (gender === "BOY") {
    return "boy";
  }

  if (gender === "GIRL") {
    return "girl";
  }

  return "neutral";
};

const ChevronLeftIcon = ({ className = "h-4 w-4" }: { className?: string }) => {
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

const ChevronRightIcon = ({ className = "h-4 w-4" }: { className?: string }) => {
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

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange
}: PaginationControlsProps) => {
  if (totalPages <= 1) {
    return null;
  }

  const paginationItems = getPaginationItems(currentPage, totalPages);
  const baseButtonClassName =
    "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mt-6 flex justify-center border-t border-slate-200/80 pb-6 pt-5">
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
                …
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
};

const getParam = (params: URLSearchParams, key: string): string => {
  return params.get(key)?.trim() ?? "";
};

const getStatusParam = (params: URLSearchParams): "" | VisibleStudentAdmissionStatus => {
  const status = getParam(params, "status");

  return status === "ACCEPTED" || status === "WAITLISTED" ? status : "";
};

const getSortByParam = (
  params: URLSearchParams
): NonNullable<StudentFilterParams["sortBy"]> => {
  const sortBy = getParam(params, "sortBy");

  return sortableFields.includes(sortBy as NonNullable<StudentFilterParams["sortBy"]>)
    ? (sortBy as NonNullable<StudentFilterParams["sortBy"]>)
    : "submittedAt";
};

const isValidPageSize = (value: number): value is PageSize => {
  return pageSizeOptions.includes(value as PageSize);
};

const hasParam = (params: URLSearchParams, key: string): boolean => {
  return params.has(key) && getParam(params, key).length > 0;
};

const readStoredStudentListViewState = (): Partial<StudentListViewState> => {
  try {
    const rawValue = window.localStorage.getItem(studentListViewStorageKey);

    if (!rawValue) {
      return {};
    }

    const value = JSON.parse(rawValue) as Partial<StudentListViewState>;

    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

const getInitialPage = (
  params: URLSearchParams,
  storedState: Partial<StudentListViewState>
): number => {
  if (hasParam(params, "page")) {
    return Math.max(1, Number(getParam(params, "page")) || 1);
  }

  return Math.max(1, Number(storedState.page) || 1);
};

const getInitialPageSize = (
  params: URLSearchParams,
  storedState: Partial<StudentListViewState>
): PageSize => {
  if (hasParam(params, "limit")) {
    const requestedLimit = Number(getParam(params, "limit"));

    return isValidPageSize(requestedLimit) ? requestedLimit : 4;
  }

  const storedLimit = Number(storedState.limit);

  return isValidPageSize(storedLimit) ? storedLimit : 4;
};

const getInitialStudentSearchParams = (
  params: URLSearchParams,
  storedState: Partial<StudentListViewState>
): URLSearchParams => {
  const nextParams = new URLSearchParams(params);
  const storedValues: Record<string, string | undefined> = {
    status: storedState.status,
    levelId: storedState.levelId,
    schoolYearId: storedState.schoolYearId,
    isPriority: storedState.isPriority,
    familyId: storedState.familyId,
    sortBy: storedState.sortBy,
    sortOrder: storedState.sortOrder
  };

  Object.entries(storedValues).forEach(([key, value]) => {
    if (!hasParam(nextParams, key) && value) {
      nextParams.set(key, value);
    }
  });

  return nextParams;
};

const getInitialSearch = (
  params: URLSearchParams,
  storedState: Partial<StudentListViewState>
): string => {
  if (hasParam(params, "search")) {
    return getParam(params, "search");
  }

  return typeof storedState.search === "string" ? storedState.search : "";
};

const writeStoredStudentListViewState = (state: StudentListViewState): void => {
  try {
    window.localStorage.setItem(studentListViewStorageKey, JSON.stringify(state));
  } catch {
    // Ignore private browsing or storage quota failures.
  }
};

const StudentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialListViewState] = useState(() =>
    consumePostLoginFilterDefaults("students")
      ? {}
      : readStoredStudentListViewState()
  );
  const [studentParams, setStudentParams] = useState(() =>
    getInitialStudentSearchParams(searchParams, initialListViewState)
  );
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearSummary[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYearSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [search, setSearch] = useState(() =>
    getInitialSearch(searchParams, initialListViewState)
  );
  const [page, setPage] = useState(() => getInitialPage(searchParams, initialListViewState));
  const [limit, setLimit] = useState<PageSize>(() =>
    getInitialPageSize(searchParams, initialListViewState)
  );
  const hasMountedSearchReset = useRef(false);
  const deferredSearch = useDeferredValue(search);

  const filters = useMemo<StudentFilterParams>(() => {
    const isPriority = getParam(studentParams, "isPriority");
    const sortOrder = getParam(studentParams, "sortOrder");

    return {
      search: deferredSearch.trim() || undefined,
      status: getStatusParam(studentParams) || undefined,
      levelId: getParam(studentParams, "levelId") || undefined,
      schoolYearId: getParam(studentParams, "schoolYearId") || activeSchoolYear?.id,
      isPriority: isPriority === "true" ? "true" : undefined,
      familyId: getParam(studentParams, "familyId") || undefined,
      page: "1",
      limit: "5000",
      sortBy: getSortByParam(studentParams),
      sortOrder: sortOrder === "asc" ? "asc" : "desc"
    };
  }, [activeSchoolYear?.id, deferredSearch, studentParams]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(students.length / limit));
  }, [limit, students.length]);
  const currentPageStudents = useMemo(() => {
    const startIndex = (page - 1) * limit;

    return students.slice(startIndex, startIndex + limit);
  }, [limit, page, students]);

  const selectedLevel = levels.find((level) => level.id === filters.levelId) ?? null;
  const selectedSchoolYear =
    schoolYears.find((schoolYear) => schoolYear.id === filters.schoolYearId) ?? null;
  const defaultSchoolYearId = activeSchoolYear?.id ?? "";
  const activeSchoolYearLabel = selectedSchoolYear
    ? formatSchoolYearLabel(selectedSchoolYear.label)
    : activeSchoolYear
      ? formatSchoolYearLabel(activeSchoolYear.label)
      : "Toutes les années";
  const studentListAnimationKey = [
    page,
    limit,
    filters.search ?? "",
    filters.status ?? "",
    filters.levelId ?? "",
    filters.schoolYearId ?? "",
    filters.isPriority ?? "",
    filters.familyId ?? "",
    filters.sortBy ?? "",
    filters.sortOrder ?? ""
  ].join("|");
  const hasActiveFilters = useMemo(() => {
    return (
      search.trim().length > 0 ||
      Boolean(filters.status) ||
      Boolean(filters.levelId) ||
      filters.schoolYearId !== defaultSchoolYearId ||
      Boolean(filters.isPriority) ||
      Boolean(filters.familyId) ||
      filters.sortBy !== "submittedAt" ||
      filters.sortOrder !== "desc"
    );
  }, [
    defaultSchoolYearId,
    filters.familyId,
    filters.isPriority,
    filters.levelId,
    filters.schoolYearId,
    filters.sortBy,
    filters.sortOrder,
    filters.status,
    search
  ]);

  const inputClassName =
    "w-full rounded-2xl border border-primary/15 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 shadow-[0_12px_26px_-24px_rgba(31,77,58,0.22)] outline-none transition hover:border-primary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20";

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>): void => {
      const nextParams = new URLSearchParams(studentParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          nextParams.set(key, value);
        } else {
          nextParams.delete(key);
        }
      });

      nextParams.delete("page");
      nextParams.delete("limit");
      setPage(1);
      setStudentParams(nextParams);
      setSearchParams(nextParams);
    },
    [setSearchParams, studentParams]
  );

  const resetFilters = useCallback((): void => {
    const nextParams = new URLSearchParams();

    if (defaultSchoolYearId) {
      nextParams.set("schoolYearId", defaultSchoolYearId);
    }

    setSearch("");
    setPage(1);
    setStudentParams(nextParams);
    setSearchParams(nextParams);
  }, [defaultSchoolYearId, setSearchParams]);

  useEffect(() => {
    if (!studentParams.has("search")) {
      return;
    }

    const requestedSearch = getParam(studentParams, "search");

    setSearch((currentSearch) =>
      currentSearch === requestedSearch ? currentSearch : requestedSearch
    );
  }, [studentParams]);

  useEffect(() => {
    if (!hasMountedSearchReset.current) {
      hasMountedSearchReset.current = true;
      return;
    }

    setPage(1);
  }, [deferredSearch]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  useEffect(() => {
    writeStoredStudentListViewState({
      search,
      status: getStatusParam(studentParams),
      levelId: getParam(studentParams, "levelId"),
      schoolYearId: getParam(studentParams, "schoolYearId"),
      isPriority: getParam(studentParams, "isPriority") === "true" ? "true" : "",
      familyId: getParam(studentParams, "familyId"),
      page,
      limit,
      sortBy: getSortByParam(studentParams),
      sortOrder: getParam(studentParams, "sortOrder") === "asc" ? "asc" : "desc"
    });
  }, [limit, page, search, studentParams]);

  const loadReferenceData = useCallback(async (signal: AbortSignal): Promise<void> => {
    const [loadedLevels, loadedSchoolYears, loadedActiveSchoolYear] = await Promise.all([
      getLevels({ signal }),
      getSchoolYears({ signal }),
      getActiveSchoolYear({ signal }).catch(() => null)
    ]);

    if (signal.aborted) {
      return;
    }

    setLevels(loadedLevels);
    setSchoolYears(loadedSchoolYears);
    setActiveSchoolYear(loadedActiveSchoolYear);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadReferenceData(controller.signal);

    return () => controller.abort();
  }, [loadReferenceData]);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    void getStudents(filters, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setStudents(response.data);
        setTotalStudents(response.meta.total);
      })
      .catch((loadError) => {
        if (isAbortError(loadError) || controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les élèves."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setHasLoadedOnce(true);
        }
      });

    return () => controller.abort();
  }, [filters]);

  const pageTopBar = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div
        className="ui-animate-in ui-animate-in--subtle w-fit rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]"
        style={getEnterStyle(20)}
      >
        <Breadcrumb items={[{ label: "Tableau de bord", href: "/" }, { label: "Élèves" }]} />
      </div>

      <div
        className="ui-animate-in ui-animate-in--subtle rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-center text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]"
        style={getEnterStyle(90)}
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primaryLight">
          Année affichée
        </p>
        <p className="mt-1 font-semibold">{activeSchoolYearLabel}</p>
      </div>
    </div>
  );

  const pageHeader = (
    <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(130)}>
      <PageSectionHeader
        topBar={pageTopBar}
        eyebrow="Élèves"
        title="Traitement des élèves"
        description="Pilotez les décisions élève par élève avec les filtres utiles au suivi quotidien des inscriptions."
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

  if (error && students.length === 0) {
    return (
      <>
        {pageHeader}
        <ErrorState message={error} actionLabel="Réessayer" onAction={() => updateParams({})} />
      </>
    );
  }

  return (
    <>
      {pageHeader}

      <section
        className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent overflow-hidden rounded-[32px] border border-primary/20 bg-[#fffdf8] shadow-[0_30px_66px_-38px_rgba(31,77,58,0.42)]"
        style={getEnterStyle(190)}
      >
        <div className="border-b border-secondary/30 bg-primary px-6 py-5 text-white sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                Poste principal
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {getStudentCountLabel(totalStudents)}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">
                Recherche, tri et décisions restent centrés sur les statuts élèves.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filters.status ? <StudentStatusBadge status={filters.status} /> : null}
              {selectedLevel ? (
                <LevelBadge code={selectedLevel.code} label={selectedLevel.label} size="md" />
              ) : null}
              {filters.isPriority === "true" ? <PriorityBadge isPriority /> : null}
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex shrink-0 items-center rounded-full border border-white/25 bg-white px-4 py-2 text-sm font-semibold text-primaryDark transition hover:border-secondary hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#fffaf2] px-6 py-5 sm:px-7">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Recherche
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom élève, parent, email ou téléphone..."
                className={`${inputClassName} mt-2`}
              />
            </label>

            <label className="block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Statut élève
              </span>
              <select
                value={filters.status ?? ""}
                onChange={(event) => updateParams({ status: event.target.value || undefined })}
                className={`${inputClassName} mt-2`}
              >
                <option value="">Tous les statuts</option>
                <option value="WAITLISTED">En attente</option>
                <option value="ACCEPTED">Accepté</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Priorité
              </span>
              <select
                value={filters.isPriority ?? ""}
                onChange={(event) => updateParams({ isPriority: event.target.value || undefined })}
                className={`${inputClassName} mt-2`}
              >
                <option value="">Toutes</option>
                <option value="true">Prioritaires</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Niveau demandé
              </span>
              <select
                value={filters.levelId ?? ""}
                onChange={(event) => updateParams({ levelId: event.target.value || undefined })}
                className={`${inputClassName} mt-2`}
              >
                <option value="">Tous les niveaux</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.label} · {level.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Année scolaire
              </span>
              <select
                value={filters.schoolYearId ?? ""}
                onChange={(event) => updateParams({ schoolYearId: event.target.value || undefined })}
                className={`${inputClassName} mt-2`}
              >
                <option value="">Toutes les années</option>
                {schoolYears.map((schoolYear) => (
                  <option key={schoolYear.id} value={schoolYear.id}>
                    {formatSchoolYearLabel(schoolYear.label)}
                    {schoolYear.isActive ? " · active" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Famille
              </span>
              <input
                value={filters.familyId ?? ""}
                onChange={(event) => updateParams({ familyId: event.target.value.trim() || undefined })}
                placeholder="Identifiant famille"
                className={`${inputClassName} mt-2`}
              />
            </label>

            <label className="block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Tri
              </span>
              <select
                value={filters.sortBy}
                onChange={(event) => updateParams({ sortBy: event.target.value })}
                className={`${inputClassName} mt-2`}
              >
                <option value="lastName">Nom</option>
                <option value="firstName">Prénom</option>
                <option value="level">Niveau</option>
                <option value="birthDate">Date de naissance</option>
                <option value="submittedAt">Date de soumission</option>
                <option value="status">Statut</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Ordre
              </span>
              <select
                value={filters.sortOrder}
                onChange={(event) => updateParams({ sortOrder: event.target.value })}
                className={`${inputClassName} mt-2`}
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {isLoading && hasLoadedOnce ? <LoadingState variant="card" /> : null}
        {error && students.length > 0 ? (
          <ErrorState message={`${error} Les derniers résultats restent affichés.`} />
        ) : null}

        {!isLoading && students.length === 0 ? (
          <EmptyState
            title="Aucun élève trouvé"
            description="Aucun élève ne correspond aux filtres sélectionnés."
          />
        ) : null}

        {students.length > 0 ? (
          <section
            className="ui-animate-in overflow-hidden rounded-[32px] border border-white/80 bg-white/92 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.3)]"
            style={getEnterStyle(250)}
          >
            <div className="border-b border-slate-200/80 px-6 py-5 sm:px-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                    Résultats
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {getStudentCountLabel(students.length)}
                  </h2>
                </div>
                <div className="flex flex-nowrap items-center gap-2">
                  <span className="inline-flex shrink-0 items-center rounded-full border border-primary/15 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primaryDark">
                    {currentPageStudents.length === 0 ? 0 : (page - 1) * limit + 1}-
                    {Math.min(page * limit, students.length)} sur {students.length}
                  </span>
                  <label className="inline-flex min-w-0 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3.5 pr-1.5 text-sm font-medium text-slate-700">
                    <span className="whitespace-nowrap">Élèves par page</span>
                    <select
                      value={limit}
                      onChange={(event) => {
                        setLimit(Number(event.target.value) as PageSize);
                        setPage(1);
                      }}
                      className="w-[4.25rem] rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                      {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6">
              <div className="space-y-3">
              {currentPageStudents.map((student, index) => (
                <article
                  key={`${studentListAnimationKey}-${student.id}`}
                  className="ui-animate-in ui-surface-hover ui-surface-hover--soft grid gap-4 rounded-[28px] border border-slate-200/90 bg-slate-50/80 p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] transition hover:bg-white lg:grid-cols-[minmax(0,1.25fr)_160px_minmax(0,1fr)_170px_150px] lg:items-center sm:p-5"
                  style={getEnterStyle(300 + index * 30)}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <PersonAvatar
                      label={`${student.firstName} ${student.lastName}`}
                      size="md"
                      variant={getStudentAvatarVariant(student.gender)}
                    />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Élève
                      </p>
                      <Link
                        to={`/students/${student.id}`}
                        className="mt-1 block text-lg font-semibold text-slate-900 transition hover:text-primary"
                      >
                        {student.firstName} {student.lastName}
                      </Link>
                      <p className="mt-1 text-sm text-slate-500">
                        Né(e) le {formatDate.format(new Date(student.birthDate))}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Niveau
                    </p>
                    <div className="mt-2">
                      <LevelBadge code={student.level.code} label={student.level.label} size="sm" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Famille
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Famille {getFamilyDisplayName(student)}
                    </p>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {student.application.family.contactEmail || "Email non renseigné"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Statut
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StudentStatusBadge status={student.admissionStatus} />
                      <PriorityBadge isPriority={student.isPriority} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      to={`/students/${student.id}`}
                      className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryDark"
                    >
                      Fiche élève
                    </Link>
                    <Link
                      to={`/applications/${student.application.id}`}
                      className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary"
                    >
                      Famille
                    </Link>
                  </div>
                </article>
              ))}
              </div>
            </div>

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </section>
        ) : null}
      </section>
    </>
  );
};

export default StudentsPage;
