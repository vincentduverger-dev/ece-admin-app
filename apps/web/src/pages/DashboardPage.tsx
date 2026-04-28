import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type JSX
} from "react";
import { Link } from "react-router-dom";

import PageSectionHeader from "../components/layout/PageSectionHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LevelBadge from "../components/ui/LevelBadge";
import LoadingState from "../components/ui/LoadingState";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { fetchDashboardStats, getActiveSchoolYear } from "../lib/api";
import { getLevelVisualStyle } from "../lib/levelVisuals";
import type { SchoolYearSummary } from "../types/application";
import type {
  DashboardApplicationStatus,
  DashboardPriorityApplication,
  DashboardStats
} from "../types/dashboard";

type IconProps = {
  className?: string;
};

type DashboardMetricIcon = (props: IconProps) => JSX.Element;

type StatusCardConfig = {
  status: DashboardApplicationStatus;
  label: string;
  description: string;
  getValue?: (data: DashboardStats) => number;
  valueClassName: string;
  surfaceClassName: string;
  iconClassName: string;
  Icon: DashboardMetricIcon;
};

type MetricCardProps = {
  description: string;
  Icon: DashboardMetricIcon;
  iconClassName: string;
  label: string;
  motionDelay?: number;
  surfaceClassName: string;
  value: number;
  valueClassName?: string;
};

const PRIORITY_DISPLAY_LIMIT = 3;

const dashboardHeaderEyebrow = "Administration ECE";
const dashboardHeaderTitle = "Bienvenue dans l'espace d'administration ECE";
const dashboardHeaderDescription =
  "Centralisez le suivi des inscriptions, priorisez les demandes sensibles et gardez les indicateurs principaux visibles pour accélérer les décisions quotidiennes.";

const priorityDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long"
});

const formatSchoolYearLabel = (label: string): string => {
  return label.replace(/^(\d{4})-(\d{4})$/u, "$1 - $2");
};

const getEnterStyle = (delay: number): CSSProperties => {
  return {
    "--ui-enter-delay": `${delay}ms`
  } as CSSProperties;
};

const MailMetricIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
    >
      <rect x="3.5" y="4.5" width="13" height="11" rx="2.2" />
      <path d="M4.5 6 10 10l5.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ReviewMetricIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
    >
      <circle cx="10" cy="10" r="6.2" />
      <path d="M10 6.8V10l2.5 1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const AcceptedMetricIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <path d="m4.8 10.2 3.1 3.1 7.3-7.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const WaitlistedMetricIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <circle cx="10" cy="10" r="6.2" />
      <path d="M6.8 10h6.4" strokeLinecap="round" />
      <path d="M10 6.8v6.4" strokeLinecap="round" />
    </svg>
  );
};

const PartialMetricIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M4.5 10h11" strokeLinecap="round" />
      <path d="m5.3 6.8 2.8 3.2-2.8 3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m14.7 6.8-2.8 3.2 2.8 3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const statusCards: StatusCardConfig[] = [
  {
    status: "RECEIVED",
    label: "Reçues",
    description: "Demandes nouvellement importées ou enregistrées.",
    valueClassName: "text-slate-900",
    surfaceClassName: "bg-slate-50/90",
    iconClassName: "bg-slate-900 text-white",
    Icon: MailMetricIcon
  },
  {
    status: "IN_REVIEW",
    label: "En revue",
    description: "Demandes en cours d'analyse par l'administration.",
    valueClassName: "text-info",
    surfaceClassName: "bg-info/10",
    iconClassName: "bg-info text-white",
    Icon: ReviewMetricIcon
  },
  {
    status: "ACCEPTED",
    label: "Acceptées",
    description: "Décisions favorables déjà prises.",
    valueClassName: "text-success",
    surfaceClassName: "bg-success/10",
    iconClassName: "bg-success text-white",
    Icon: AcceptedMetricIcon
  },
  {
    status: "PARTIALLY_ACCEPTED",
    label: "Partielles",
    description: "Dossiers avec des décisions différentes selon les élèves.",
    valueClassName: "text-secondaryDark",
    surfaceClassName: "bg-secondary/10",
    iconClassName: "bg-secondary text-white",
    Icon: PartialMetricIcon
  },
  {
    status: "WAITLISTED",
    label: "Liste d'attente",
    description: "Élèves placés en attente d'une place disponible.",
    getValue: (dashboardData) => dashboardData.waitlistedStudents,
    valueClassName: "text-primary",
    surfaceClassName: "bg-primary/10",
    iconClassName: "bg-primary text-white",
    Icon: WaitlistedMetricIcon
  }
];

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const getFamilyDisplayName = (
  application: DashboardPriorityApplication
): string => {
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

  return "Famille non renseignée";
};

const getPriorityChildrenLabel = (
  application: DashboardPriorityApplication
): string => {
  if (application.students.length === 0) {
    return "Aucun élève rattaché à cette demande.";
  }

  return application.students
    .map((student) => `${student.firstName} ${student.lastName}`)
    .join(" · ");
};

const getPriorityLevels = (
  application: DashboardPriorityApplication
): Array<{ code: string; label: string }> => {
  const uniqueLevels = new Map<string, { code: string; label: string }>();

  application.students.forEach((student) => {
    const code = student.level.code.trim();
    const label = student.level.label.trim();
    const key = `${code}::${label}`;

    if ((code.length > 0 || label.length > 0) && !uniqueLevels.has(key)) {
      uniqueLevels.set(key, { code, label });
    }
  });

  return Array.from(uniqueLevels.values());
};

const MetricCard = ({
  label,
  value,
  description,
  Icon,
  iconClassName,
  motionDelay = 0,
  surfaceClassName,
  valueClassName = "text-primary"
}: MetricCardProps) => {
  return (
    <article
      className={`ui-animate-in ui-surface-hover rounded-[28px] border border-white/80 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.32)] ${surfaceClassName}`}
      style={getEnterStyle(motionDelay)}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <span
          className={`ui-surface-hover__icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className={`mt-6 text-4xl font-semibold tracking-tight ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
};

const isWideLevelCard = (levelCode: string): boolean => {
  const normalizedCode = levelCode.trim().toUpperCase();

  return normalizedCode === "CM1" || normalizedCode === "CM2";
};

const DashboardPage = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPriorityPage, setCurrentPriorityPage] = useState(1);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYearSummary | null>(
    null
  );
  const [isLoadingActiveSchoolYear, setIsLoadingActiveSchoolYear] = useState(true);

  const loadDashboard = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const dashboardData = await fetchDashboardStats({ signal });

      if (signal?.aborted) {
        return;
      }

      setData(dashboardData);
    } catch (loadError) {
      if (isAbortError(loadError) || signal?.aborted) {
        return;
      }

      setData(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Une erreur inattendue est survenue."
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadDashboard(controller.signal);
    void (async () => {
      setIsLoadingActiveSchoolYear(true);

      try {
        const schoolYear = await getActiveSchoolYear({ signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        setActiveSchoolYear(schoolYear);
      } catch (loadError) {
        if (isAbortError(loadError) || controller.signal.aborted) {
          return;
        }

        setActiveSchoolYear(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingActiveSchoolYear(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [loadDashboard]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((data?.priorityApplications.length ?? 0) / PRIORITY_DISPLAY_LIMIT)
    );

    setCurrentPriorityPage((currentPage) => Math.min(currentPage, totalPages));
  }, [data?.priorityApplications.length]);

  const dashboardView = useMemo(() => {
    if (!data) {
      return null;
    }

    const totalPriorityPages = Math.max(
      1,
      Math.ceil(data.priorityApplications.length / PRIORITY_DISPLAY_LIMIT)
    );
    const priorityStartIndex = (currentPriorityPage - 1) * PRIORITY_DISPLAY_LIMIT;
    const visiblePriorityApplications = data.priorityApplications.slice(
      priorityStartIndex,
      priorityStartIndex + PRIORITY_DISPLAY_LIMIT
    );

    return {
      maxLevelCount: Math.max(...data.byLevel.map((level) => level.count), 0),
      totalStudents: data.byLevel.reduce((sum, level) => sum + level.count, 0),
      totalPriorityPages,
      visiblePriorityApplications,
      visiblePriorityStart:
        data.priorityApplications.length === 0 ? 0 : priorityStartIndex + 1,
      visiblePriorityEnd: Math.min(
        currentPriorityPage * PRIORITY_DISPLAY_LIMIT,
        data.priorityApplications.length
      )
    };
  }, [currentPriorityPage, data]);

  const handlePreviousPriorityPage = useCallback((): void => {
    setCurrentPriorityPage((page) => Math.max(1, page - 1));
  }, []);

  const handleNextPriorityPage = useCallback((): void => {
    setCurrentPriorityPage((page) =>
      Math.min(dashboardView?.totalPriorityPages ?? 1, page + 1)
    );
  }, [dashboardView?.totalPriorityPages]);

  const pageTopBar = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div
        className="ui-animate-in ui-animate-in--subtle w-fit rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]"
        style={getEnterStyle(20)}
      >
        <Breadcrumb
          items={[
            { label: "Tableau de bord" }
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
          <p className="mt-1 text-center font-semibold">
            {isLoadingActiveSchoolYear
              ? "Chargement..."
              : activeSchoolYear
                ? formatSchoolYearLabel(activeSchoolYear.label)
                : "Non configurée"}
          </p>
        </div>
      </div>
    </div>
  );

  const pageHeader = (
    <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(130)}>
      <PageSectionHeader
        topBar={pageTopBar}
        eyebrow={dashboardHeaderEyebrow}
        title={dashboardHeaderTitle}
        description={dashboardHeaderDescription}
      />
    </div>
  );

  if (isLoading && !data) {
    return (
      <>
        {pageHeader}
        <LoadingState variant="page" />
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        {pageHeader}
        <ErrorState
          message={error}
          actionLabel="Réessayer"
          onAction={() => void loadDashboard()}
        />
      </>
    );
  }

  if (!data || data.totalApplications === 0) {
    return (
      <>
        {pageHeader}
        <EmptyState
          title="Aucune donnée disponible"
          description="Le dashboard s'alimentera automatiquement dès qu'une demande et des élèves seront présents en base."
        />
      </>
    );
  }

  if (!dashboardView) {
    return null;
  }

  return (
    <>
      {pageHeader}

      <section
        className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent overflow-hidden rounded-[32px] border border-white/80 bg-white/92 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)]"
        style={getEnterStyle(190)}
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Suivi des demandes
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Demandes par statut
              </h2>
              <p className="mt-3 max-w-4xl text-[1.02rem] leading-8 text-slate-600">
                Visualisez la répartition des dossiers selon leur état de
                traitement pour prioriser les prochaines actions.
              </p>
            </div>

            <div
              className="ui-animate-in inline-flex w-fit shrink-0 flex-col rounded-[28px] border border-primary/15 bg-primary/5 px-7 py-5 text-center shadow-[0_14px_26px_-22px_rgba(31,77,58,0.28)] lg:ml-6"
              style={getEnterStyle(240)}
            >
              <p className="text-[0.74rem] font-semibold uppercase tracking-[0.22em] text-primaryDark">
                Total
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                {data.totalApplications}
              </p>
              <p className="mt-1 text-sm text-slate-500">demandes suivies</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span
              className="ui-animate-in inline-flex items-center rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-sm font-medium text-secondaryDark"
              style={getEnterStyle(300)}
            >
              {data.priorityApplications.length} prioritaires
            </span>
            <span
              className="ui-animate-in inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
              style={getEnterStyle(360)}
            >
              {data.byLevel.length} niveaux suivis
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {statusCards.map((card, index) => (
              <MetricCard
                key={card.status}
                label={card.label}
                value={card.getValue ? card.getValue(data) : data.byStatus[card.status]}
                description={card.description}
                Icon={card.Icon}
                iconClassName={card.iconClassName}
                motionDelay={360 + index * 70}
                surfaceClassName={card.surfaceClassName}
                valueClassName={card.valueClassName}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-6">
        <article
          className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] sm:p-8"
          style={getEnterStyle(430)}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Répartition par niveau
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Élèves par classe demandée
              </h2>
              <p className="mt-3 max-w-4xl text-[1.02rem] leading-8 text-slate-600">
                Repérez d&apos;un coup d&apos;œil les niveaux les plus demandés
                pour faciliter la préparation des places et l&apos;ordre de
                traitement.
              </p>
            </div>

            <div
              className="ui-animate-in inline-flex w-fit shrink-0 flex-col rounded-[28px] border border-secondary/20 bg-secondary/10 px-7 py-5 text-center shadow-[0_14px_26px_-22px_rgba(212,162,76,0.28)] lg:ml-6"
              style={getEnterStyle(500)}
            >
              <p className="text-[0.74rem] font-semibold uppercase tracking-[0.22em] text-secondaryDark">
                Total
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                {dashboardView.totalStudents}
              </p>
              <p className="mt-1 text-sm text-slate-500">élèves répartis</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-12">
            {data.byLevel.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
                Aucun niveau disponible.
              </p>
            ) : (
              data.byLevel.map((level, index) => {
                const share =
                  dashboardView.totalStudents === 0
                    ? 0
                    : Math.round((level.count / dashboardView.totalStudents) * 100);
                const width =
                  dashboardView.maxLevelCount === 0 || level.count === 0
                    ? 0
                    : Math.max((level.count / dashboardView.maxLevelCount) * 100, 6);
                const visual = getLevelVisualStyle(level.code, level.label, index);
                const levelCardClassName = isWideLevelCard(level.code)
                  ? "xl:col-span-6"
                  : "xl:col-span-4";

                return (
                  <div
                    key={level.code}
                    className={`ui-animate-in ui-surface-hover ui-surface-hover--soft rounded-[28px] border p-5 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.16)] ${levelCardClassName}`}
                    style={{
                      ...getEnterStyle(560 + index * 70),
                      backgroundColor: visual.cardBackground,
                      borderColor: visual.borderColor
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-2xl font-semibold tracking-tight text-slate-900">
                          {level.label}
                        </p>
                        <LevelBadge
                          code={level.code}
                          label={level.label}
                          size="md"
                          className="ui-surface-hover__chip mt-3"
                        />
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-3xl font-semibold tracking-tight text-slate-900">
                          {level.count}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {share}% des élèves
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-6 overflow-hidden rounded-full p-1"
                      style={{ backgroundColor: visual.trackColor }}
                    >
                      <div
                        className="ui-surface-hover__bar h-3.5 rounded-full shadow-[0_10px_18px_-14px_rgba(15,23,42,0.55)]"
                        style={{
                          width: `${width}%`,
                          backgroundColor: visual.barColor
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article
          className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.24)]"
          style={getEnterStyle(690)}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Demandes prioritaires
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Dossiers à traiter en priorité
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Conservez les dossiers sensibles en haut de pile avec une lecture
                rapide de la famille, des enfants concernés, du niveau demandé et
                du statut actuel.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primaryDark">
              {data.priorityApplications.length} priorité
              {data.priorityApplications.length > 1 ? "s" : ""}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {data.priorityApplications.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
                Aucune demande prioritaire pour le moment.
              </p>
            ) : (
              dashboardView.visiblePriorityApplications.map((application, index) => {
                const priorityLevels = getPriorityLevels(application);

                return (
                  <article
                    key={application.id}
                    className="ui-animate-in ui-surface-hover ui-surface-hover--soft rounded-[28px] border border-slate-200/90 bg-slate-50/80 p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)]"
                    style={getEnterStyle(760 + index * 80)}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Famille {getFamilyDisplayName(application)}
                          </h3>
                          <PriorityBadge isPriority={application.isPriority} />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {application.schoolYear.label}
                          {application.schoolYear.isActive ? " · année active" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={application.status} />
                        <Link
                          to={`/applications/${application.id}`}
                          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                        >
                          Voir la demande
                        </Link>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Enfants
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {getPriorityChildrenLabel(application)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Niveau
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {priorityLevels.length === 0 ? (
                            <span className="text-sm leading-6 text-slate-500">
                              Niveau non renseigné
                            </span>
                          ) : (
                            priorityLevels.map((level) => (
                              <LevelBadge
                                key={`${application.id}-${level.code}-${level.label}`}
                                code={level.code}
                                label={level.label}
                                size="sm"
                              />
                            ))
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Contact
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {application.family.contactEmail ? (
                            <a
                              href={`mailto:${application.family.contactEmail}`}
                              className="break-all text-primary hover:text-primaryDark"
                            >
                              {application.family.contactEmail}
                            </a>
                          ) : (
                            "Non renseigné"
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Date
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {priorityDateFormatter.format(new Date(application.createdAt))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {application.students.length === 0 ? (
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                          Aucun élève rattaché
                        </span>
                      ) : (
                        application.students.map((student) => (
                          <span
                            key={`${application.id}-${student.firstName}-${student.lastName}-${student.level.code}`}
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
                        ))
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {data.priorityApplications.length > 0 ? (
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Affichage de {dashboardView.visiblePriorityStart} à {dashboardView.visiblePriorityEnd} sur{" "}
                {data.priorityApplications.length} demande
                {data.priorityApplications.length > 1 ? "s" : ""}.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviousPriorityPage}
                  disabled={currentPriorityPage === 1}
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Précédent
                </button>
                <span className="min-w-[96px] text-center text-sm font-medium text-slate-600">
                  Page {currentPriorityPage} / {dashboardView.totalPriorityPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPriorityPage}
                  disabled={currentPriorityPage === dashboardView.totalPriorityPages}
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          ) : null}

          {data.priorityApplications.length > 0 ? (
            <div className="mt-4">
              <Link
                to="/applications"
                className="inline-flex items-center rounded-full text-sm font-semibold text-primary transition hover:text-primaryDark"
              >
                Ouvrir toutes les demandes
              </Link>
            </div>
          ) : null}
        </article>
      </section>
    </>
  );
};

export default DashboardPage;
