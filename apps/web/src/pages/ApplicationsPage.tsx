import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode
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
  isPriority: "" | "true";
  search: string;
};

type SortOption = "createdAtDesc" | "createdAtAsc" | "priorityDesc";

type PageSize = 6 | 8 | 10 | 12;

type StatusOption = {
  value: "" | ApplicationStatus;
  label: string;
};

type ApplicationsSortOption = {
  value: SortOption;
  label: string;
};

type IconProps = {
  className?: string;
};

type FilterFieldProps = {
  label: string;
  className?: string;
  children: ReactNode;
};

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const pageSizeOptions: PageSize[] = [6, 8, 10, 12];

const statusOptions: StatusOption[] = [
  { value: "", label: "Tous les statuts" },
  { value: "RECEIVED", label: "Reçues" },
  { value: "IN_REVIEW", label: "En revue" },
  { value: "ACCEPTED", label: "Acceptées" },
  { value: "WAITLISTED", label: "Liste d'attente" },
  { value: "PARTIALLY_ACCEPTED", label: "Décisions partielles" }
];

const isApplicationStatus = (value: string): value is ApplicationStatus => {
  return statusOptions.some((option) => option.value === value && option.value !== "");
};

const getRequestedStatusFilter = (
  searchParams: URLSearchParams
): "" | ApplicationStatus => {
  const requestedStatus = searchParams.get("status")?.trim() ?? "";

  return isApplicationStatus(requestedStatus) ? requestedStatus : "";
};

const sortOptions: ApplicationsSortOption[] = [
  { value: "createdAtDesc", label: "Plus récentes d'abord" },
  { value: "createdAtAsc", label: "Plus anciennes d'abord" },
  { value: "priorityDesc", label: "Prioritaires d'abord" }
];

const createdAtDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const createdAtTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit"
});

const formatSchoolYearLabel = (label: string): string => {
  return label.replace(/^(\d{4})-(\d{4})$/u, "$1 - $2");
};

const getEnterStyle = (delay: number): CSSProperties => {
  return {
    "--ui-enter-delay": `${delay}ms`
  } as CSSProperties;
};

const getApplicationsCountLabel = (count: number): string => {
  return `${count} demande${count > 1 ? "s" : ""}`;
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const compareApplicationsByCreatedAtDesc = (
  leftApplication: ApplicationListItem,
  rightApplication: ApplicationListItem
): number => {
  return (
    new Date(rightApplication.createdAt).getTime() -
    new Date(leftApplication.createdAt).getTime()
  );
};

const sortApplications = (
  applications: ApplicationListItem[],
  sort: SortOption
): ApplicationListItem[] => {
  const sortedApplications = [...applications];

  if (sort === "createdAtAsc") {
    return sortedApplications.sort(
      (leftApplication, rightApplication) =>
        new Date(leftApplication.createdAt).getTime() -
        new Date(rightApplication.createdAt).getTime()
    );
  }

  if (sort === "priorityDesc") {
    return sortedApplications.sort((leftApplication, rightApplication) => {
      if (leftApplication.isPriority !== rightApplication.isPriority) {
        return Number(rightApplication.isPriority) - Number(leftApplication.isPriority);
      }

      return compareApplicationsByCreatedAtDesc(leftApplication, rightApplication);
    });
  }

  return sortedApplications.sort(compareApplicationsByCreatedAtDesc);
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

const SearchIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="7" cy="7" r="4.6" />
      <path d="m10.3 10.3 3.2 3.2" />
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

const FilterField = ({ label, className, children }: FilterFieldProps) => {
  return (
    <label className={className}>
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
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
});

const ApplicationsPage = () => {
  const [searchParams] = useSearchParams();
  const requestedSchoolYearId = searchParams.get("schoolYearId")?.trim() ?? "";
  const requestedStatus = getRequestedStatusFilter(searchParams);
  const [hasInitializedSchoolYearFilter, setHasInitializedSchoolYearFilter] = useState(
    requestedSchoolYearId.length > 0
  );
  const [filters, setFilters] = useState<FilterState>(() => ({
    status: requestedStatus,
    schoolYearId: requestedSchoolYearId,
    isPriority: "",
    search: ""
  }));
  const [sort, setSort] = useState<SortOption>("createdAtDesc");
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [schoolYearsError, setSchoolYearsError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSchoolYearsLoading, setIsSchoolYearsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(8);
  const deferredSearch = useDeferredValue(filters.search);
  const applicationQueryParams = useMemo<ApplicationFilterParams>(() => {
    const params: ApplicationFilterParams = {};
    const normalizedSearch = deferredSearch.trim();

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.schoolYearId) {
      params.schoolYearId = filters.schoolYearId;
    }

    if (filters.isPriority) {
      params.isPriority = filters.isPriority;
    }

    if (normalizedSearch) {
      params.search = normalizedSearch;
    }

    return params;
  }, [filters.status, filters.schoolYearId, filters.isPriority, deferredSearch]);
  const displayedApplications = useMemo(() => {
    return sortApplications(applications, sort);
  }, [applications, sort]);
  const selectedSchoolYear = useMemo(() => {
    return schoolYears.find((schoolYear) => schoolYear.id === filters.schoolYearId) ?? null;
  }, [filters.schoolYearId, schoolYears]);
  const activeSchoolYear = useMemo(() => {
    return schoolYears.find((schoolYear) => schoolYear.isActive) ?? null;
  }, [schoolYears]);
  const defaultSchoolYearId = requestedSchoolYearId || activeSchoolYear?.id || "";
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(displayedApplications.length / pageSize));
  }, [displayedApplications.length, pageSize]);
  const resolvedCurrentPage = Math.min(currentPage, totalPages);
  const currentPageApplications = useMemo(() => {
    const startIndex = (resolvedCurrentPage - 1) * pageSize;

    return displayedApplications.slice(startIndex, startIndex + pageSize);
  }, [displayedApplications, pageSize, resolvedCurrentPage]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== "" ||
      filters.schoolYearId !== defaultSchoolYearId ||
      filters.isPriority !== "" ||
      filters.search.trim().length > 0
    );
  }, [
    defaultSchoolYearId,
    filters.isPriority,
    filters.schoolYearId,
    filters.search,
    filters.status
  ]);
  const activeFilterCount = useMemo(() => {
    return [
      filters.status,
      filters.schoolYearId !== defaultSchoolYearId ? filters.schoolYearId : "",
      filters.isPriority,
      filters.search.trim()
    ].filter((value) => value !== "").length;
  }, [
    defaultSchoolYearId,
    filters.isPriority,
    filters.schoolYearId,
    filters.search,
    filters.status
  ]);
  const visibleStart = displayedApplications.length === 0
    ? 0
    : (resolvedCurrentPage - 1) * pageSize + 1;
  const visibleEnd = Math.min(
    resolvedCurrentPage * pageSize,
    displayedApplications.length
  );
  const schoolYearSummaryLabel = isSchoolYearsLoading
    ? "Chargement..."
    : filters.schoolYearId
      ? selectedSchoolYear
        ? formatSchoolYearLabel(selectedSchoolYear.label)
        : "Année sélectionnée"
      : "Toutes les années scolaires";
  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.28)] outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15";
  const isWaitingForDefaultSchoolYear =
    requestedSchoolYearId.length === 0 && !hasInitializedSchoolYearFilter;

  useEffect(() => {
    setFilters((currentFilters) => {
      if (currentFilters.status === requestedStatus) {
        return currentFilters;
      }

      return {
        ...currentFilters,
        status: requestedStatus
      };
    });
  }, [requestedStatus]);

  const resetFilters = useCallback((): void => {
    setFilters({
      status: "",
      schoolYearId: defaultSchoolYearId,
      isPriority: "",
      search: ""
    });
    setSort("createdAtDesc");
  }, [defaultSchoolYearId]);

  const handleStatusFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setFilters((currentFilters) => ({
        ...currentFilters,
        status: event.target.value as FilterState["status"]
      }));
    },
    []
  );

  const handleSchoolYearFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setFilters((currentFilters) => ({
        ...currentFilters,
        schoolYearId: event.target.value
      }));
    },
    []
  );

  const handlePriorityFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setFilters((currentFilters) => ({
        ...currentFilters,
        isPriority: event.target.value as FilterState["isPriority"]
      }));
    },
    []
  );

  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setSort(event.target.value as SortOption);
    },
    []
  );

  const handleSearchFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setFilters((currentFilters) => ({
        ...currentFilters,
        search: event.target.value
      }));
    },
    []
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

  const loadApplications = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getApplications(applicationQueryParams, { signal });

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
  }, [applicationQueryParams]);

  useEffect(() => {
    if (isWaitingForDefaultSchoolYear) {
      return;
    }

    const controller = new AbortController();

    void loadApplications(controller.signal);

    return () => {
      controller.abort();
    };
  }, [isWaitingForDefaultSchoolYear, loadApplications]);

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

  useEffect(() => {
    if (requestedSchoolYearId.length > 0) {
      setHasInitializedSchoolYearFilter(true);

      if (requestedSchoolYearId === filters.schoolYearId) {
        return;
      }

      setFilters((currentFilters) => ({
        ...currentFilters,
        schoolYearId: requestedSchoolYearId
      }));

      return;
    }

    if (isSchoolYearsLoading || hasInitializedSchoolYearFilter) {
      return;
    }

    setHasInitializedSchoolYearFilter(true);

    setFilters((currentFilters) => ({
      ...currentFilters,
      schoolYearId: activeSchoolYear?.id ?? ""
    }));
  }, [
    activeSchoolYear?.id,
    filters.schoolYearId,
    hasInitializedSchoolYearFilter,
    isSchoolYearsLoading,
    requestedSchoolYearId
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.schoolYearId, filters.isPriority, filters.search, pageSize, sort]);

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
            { label: "Liste des demandes" }
          ]}
        />
      </div>

      <div className="flex lg:justify-end">
        <div
          className="ui-animate-in ui-animate-in--subtle rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-center text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]"
          style={getEnterStyle(90)}
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primaryLight">
            {filters.schoolYearId === ""
              ? "Toutes les années"
              : activeSchoolYear?.id === filters.schoolYearId
                ? "Année active"
                : "Année filtrée"}
          </p>
          <p className="mt-1 font-semibold">{schoolYearSummaryLabel}</p>
        </div>
      </div>
    </div>
  );

  const pageHeader = (
    <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(130)}>
      <PageSectionHeader
        topBar={pageTopBar}
        eyebrow="Applications"
        title="Liste des demandes d'inscription"
        description="Passez d'une famille à l'autre plus vite grâce à une vue compacte, des filtres stables et un accès direct au détail de chaque dossier."
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
          onAction={() => void loadApplications()}
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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
              Filtres
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Rechercher, segmenter, trier
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Gardez la même logique métier, mais avec une barre de commande plus
              dense pour scanner rapidement les dossiers utiles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primaryDark">
              {isLoading ? "Actualisation..." : getApplicationsCountLabel(displayedApplications.length)}
            </span>
            {activeFilterCount > 0 ? (
              <span className="inline-flex items-center rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-sm font-medium text-secondaryDark">
                {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""} actif
                {activeFilterCount > 1 ? "s" : ""}
              </span>
            ) : null}
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters && sort === "createdAtDesc"}
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[190px_220px_190px_220px_minmax(0,1fr)]">
          <FilterField label="Statut" className="block">
            <select
              value={filters.status}
              onChange={handleStatusFilterChange}
              className={inputClassName}
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Année scolaire" className="block">
            <select
              value={filters.schoolYearId}
              onChange={handleSchoolYearFilterChange}
              disabled={isSchoolYearsLoading}
              className={`${inputClassName} disabled:cursor-wait disabled:bg-slate-50`}
            >
              <option value="">
                {isSchoolYearsLoading
                  ? "Chargement des années..."
                  : "Toutes les années scolaires"}
              </option>
              {schoolYears.map((schoolYear) => (
                <option key={schoolYear.id} value={schoolYear.id}>
                  {formatSchoolYearLabel(schoolYear.label)}
                  {schoolYear.isActive ? " · active" : ""}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Priorité" className="block">
            <select
              value={filters.isPriority}
              onChange={handlePriorityFilterChange}
              className={inputClassName}
            >
              <option value="">Toutes les demandes</option>
              <option value="true">Prioritaires uniquement</option>
            </select>
          </FilterField>

          <FilterField label="Tri" className="block">
            <select
              value={sort}
              onChange={handleSortChange}
              className={inputClassName}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Recherche" className="block">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={filters.search}
                onChange={handleSearchFilterChange}
                placeholder="Famille, élève ou email..."
                className={`${inputClassName} pl-11`}
              />
            </div>
          </FilterField>
        </div>

        {schoolYearsError ? (
          <p className="mt-4 rounded-[24px] border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-slate-700">
            Impossible de charger la liste des années scolaires. Le filtre par année
            reste indisponible tant que l&apos;API ne répond pas.
          </p>
        ) : null}
      </section>

      <section className="mt-6 space-y-4">
        {isLoading && hasLoadedOnce ? <LoadingState variant="card" /> : null}

        {error && applications.length > 0 ? (
          <ErrorState
            message={`${error} Les derniers résultats chargés restent affichés.`}
            actionLabel="Réessayer"
            onAction={() => void loadApplications()}
          />
        ) : null}

        {!isLoading && applications.length === 0 ? (
          <EmptyState
            title="Aucune donnée disponible"
            description={
              hasActiveFilters
                ? "Aucune demande ne correspond aux filtres actuels. Réinitialisez les filtres ou élargissez la recherche."
                : "La liste se remplira automatiquement dès qu'une demande sera présente en base."
            }
            actionLabel={hasActiveFilters ? "Réinitialiser les filtres" : undefined}
            onAction={hasActiveFilters ? resetFilters : undefined}
          />
        ) : null}

        {displayedApplications.length > 0 ? (
          <section
            className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent overflow-hidden rounded-[32px] border border-white/80 bg-white/92 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.3)]"
            style={getEnterStyle(250)}
          >
            <div className="border-b border-slate-200/80 px-6 py-5 sm:px-7">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                    Demandes
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Vue synthétique par famille
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Chaque ligne garde les repères utiles du dossier: famille,
                    année, élèves, niveaux, statut, priorité et accès immédiat au
                    détail.
                  </p>
                </div>

                <div className="flex flex-nowrap items-center gap-2">
                  <span className="inline-flex shrink-0 items-center rounded-full border border-primary/15 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primaryDark">
                    {visibleStart}-{visibleEnd} sur {displayedApplications.length}
                  </span>
                  <label className="inline-flex min-w-0 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3.5 pr-1.5 text-sm font-medium text-slate-700">
                    <span className="whitespace-nowrap">Demandes par page</span>
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
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6">
              <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.5fr)_170px_minmax(0,1.7fr)_180px_130px_108px] xl:items-center xl:gap-4 xl:px-4 xl:pb-3">
                {["Famille", "Année", "Élèves / niveaux", "Statut", "Date", "Accès"].map(
                  (label) => (
                    <p
                      key={label}
                      className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500"
                    >
                      {label}
                    </p>
                  )
                )}
              </div>

              <div className="space-y-3">
                {currentPageApplications.map((application, index) => {
                  const createdAtDate = new Date(application.createdAt);
                  const rowSurfaceClassName = application.isPriority
                    ? "border-secondary/20 bg-secondary/5"
                    : "border-slate-200/90 bg-slate-50/80";

                  return (
                    <article
                      key={application.id}
                      className={`group ui-animate-in ui-surface-hover ui-surface-hover--soft rounded-[28px] border p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] sm:p-5 ${rowSurfaceClassName}`}
                      style={getEnterStyle(310 + index * 55)}
                    >
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_170px_minmax(0,1.7fr)_180px_130px_108px] xl:items-center">
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 xl:hidden">
                            Famille
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900 xl:mt-0">
                            Famille {getFamilyDisplayName(application)}
                          </h3>
                          <p className="mt-1 break-all text-sm text-slate-500">
                            {application.family.contactEmail ?? "Contact non renseigné"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 xl:hidden">
                            Année scolaire
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 xl:mt-0">
                            {formatSchoolYearLabel(application.schoolYear.label)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {application.schoolYear.isActive ? "Année active" : "Historique"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 xl:hidden">
                            Élèves / niveaux
                          </p>
                          {application.students.length === 0 ? (
                            <span className="mt-1 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                              Aucun élève rattaché
                            </span>
                          ) : (
                            <div className="mt-1 flex flex-wrap gap-2 xl:mt-0">
                              {application.students.map((student) => (
                                <span
                                  key={student.id}
                                  className="ui-surface-hover__chip inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                  <span>
                                    {student.firstName} {student.lastName}
                                  </span>
                                  <LevelBadge
                                    code={student.level.code}
                                    label={student.level.label}
                                    size="xs"
                                  />
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 xl:hidden">
                            Statut
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 xl:mt-0 xl:flex-col xl:items-start">
                            <StatusBadge status={application.status} />
                            {application.isPriority ? (
                              <PriorityBadge isPriority={application.isPriority} />
                            ) : (
                              <p className="text-xs font-medium text-slate-500">
                                Traitement standard
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 xl:hidden">
                            Date
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900 xl:mt-0">
                            {createdAtDateFormatter.format(createdAtDate)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {createdAtTimeFormatter.format(createdAtDate)}
                          </p>
                        </div>

                        <div className="xl:justify-self-end">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500 xl:hidden">
                            Accès
                          </p>
                          <Link
                            to={`/applications/${application.id}`}
                            className="mt-1 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition group-hover:border-primary/25 group-hover:text-primary hover:border-primary/25 hover:text-primary xl:mt-0"
                          >
                            <span>Voir</span>
                            <ChevronRightIcon />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
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

export default ApplicationsPage;
