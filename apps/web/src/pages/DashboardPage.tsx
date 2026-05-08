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
import StudentStatusBadge from "../components/ui/StudentStatusBadge";
import { fetchDashboardStats, getActiveSchoolYear } from "../lib/api";
import { getLevelVisualStyle } from "../lib/levelVisuals";
import type { SchoolYearSummary } from "../types/application";
import type { VisibleStudentAdmissionStatus } from "../types/application";
import type {
  DashboardLevelStat,
  DashboardStudentStats,
  DashboardStats
} from "../types/dashboard";

type IconProps = {
  className?: string;
};

type DashboardMetricIcon = (props: IconProps) => JSX.Element;

type StatusCardConfig = {
  status: VisibleStudentAdmissionStatus;
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
  status: VisibleStudentAdmissionStatus;
  value: number;
  valueClassName?: string;
};

type LevelBreakdownItem = DashboardLevelStat & {
  chartEnd: number;
  chartMidAngle: number;
  chartStart: number;
  share: number;
  tooltipX: number;
  tooltipY: number;
  width: number;
  visual: ReturnType<typeof getLevelVisualStyle>;
};

const PRIORITY_DISPLAY_LIMIT = 3;
const LEVEL_CHART_CENTER = 112;
const LEVEL_CHART_INNER_RADIUS = 64;
const LEVEL_CHART_OUTER_RADIUS = 112;
const LEVEL_CHART_TOOLTIP_RADIUS = 80;

const dashboardHeaderEyebrow = "Administration ECE";
const dashboardHeaderTitle = "Bienvenue dans l'espace d'administration ECE";
const dashboardHeaderDescription =
  "Centralisez le suivi des inscriptions, priorisez les demandes sensibles et gardez les indicateurs principaux visibles pour accélérer les décisions quotidiennes.";

const priorityDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long"
});

const numberFormatter = new Intl.NumberFormat("fr-FR");

const formatSchoolYearLabel = (label: string): string => {
  return label.replace(/^(\d{4})-(\d{4})$/u, "$1 - $2");
};

const getEnterStyle = (delay: number): CSSProperties => {
  return {
    "--ui-enter-delay": `${delay}ms`
  } as CSSProperties;
};

const getRemainingPlacesRatio = (
  remainingPlaces: number,
  availablePlaces: number
): number => {
  if (availablePlaces <= 0) {
    return 0;
  }

  return Math.min(Math.max((remainingPlaces / availablePlaces) * 100, 0), 100);
};

const getPointOnCircle = (
  center: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians)
  };
};

const getDonutSegmentPath = (
  startAngle: number,
  endAngle: number,
  outerRadius = LEVEL_CHART_OUTER_RADIUS,
  innerRadius = LEVEL_CHART_INNER_RADIUS
): string => {
  const safeEndAngle = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
  const outerStart = getPointOnCircle(LEVEL_CHART_CENTER, outerRadius, safeEndAngle);
  const outerEnd = getPointOnCircle(LEVEL_CHART_CENTER, outerRadius, startAngle);
  const innerStart = getPointOnCircle(LEVEL_CHART_CENTER, innerRadius, startAngle);
  const innerEnd = getPointOnCircle(LEVEL_CHART_CENTER, innerRadius, safeEndAngle);
  const largeArcFlag = safeEndAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z"
  ].join(" ");
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

const ProcessedMetricIcon = ({ className = "h-5 w-5" }: IconProps) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M5 5.8h6.2" strokeLinecap="round" />
      <path d="M5 10h4.6" strokeLinecap="round" />
      <path d="M5 14.2h3.8" strokeLinecap="round" />
      <path d="m12.2 12.7 1.6 1.6 3.1-3.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3.4" y="3.4" width="13.2" height="13.2" rx="3" />
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

const statusCards: StatusCardConfig[] = [
  {
    status: "ACCEPTED",
    label: "Acceptés",
    description: "Élèves acceptés pour l'année active.",
    getValue: (dashboardData) =>
      dashboardData.studentStats?.acceptedStudents ?? dashboardData.byStatus.ACCEPTED,
    valueClassName: "text-success",
    surfaceClassName: "bg-success/10",
    iconClassName: "bg-success text-white",
    Icon: AcceptedMetricIcon
  },
  {
    status: "WAITLISTED",
    label: "En attente",
    description: "Élèves explicitement mis en attente par l'administration.",
    getValue: (dashboardData) =>
      dashboardData.studentStats?.waitlistedStudents ?? dashboardData.waitlistedStudents,
    valueClassName: "text-info",
    surfaceClassName: "bg-info/10",
    iconClassName: "bg-info text-white",
    Icon: WaitlistedMetricIcon
  }
];

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const getPriorityStudentFamilyDisplayName = (
  family: DashboardStudentStats["priorityStudents"][number]["application"]["family"]
): string => {
  const familyNames = [
    family.fatherLastName,
    family.motherLastName
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (familyNames.length > 0) {
    return Array.from(new Set(familyNames)).join(" / ");
  }

  return family.contactEmail ?? "Famille non renseignée";
};

const StatusOverviewIcon = ({ className = "h-5 w-5" }: IconProps) => {
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
      <rect x="3.5" y="4" width="13" height="12" rx="2.4" />
      <path d="M6.5 8h7" />
      <path d="M6.5 11h4.2" />
      <path d="M13.2 11.2 15 13l3-3" />
    </svg>
  );
};

const MetricCard = ({
  label,
  value,
  description,
  Icon,
  iconClassName,
  motionDelay = 0,
  surfaceClassName,
  status,
  valueClassName = "text-primary"
}: MetricCardProps) => {
  return (
    <Link
      to={`/students?status=${encodeURIComponent(status)}`}
      aria-label={`Voir les élèves avec le statut ${label}`}
      className={`ui-animate-in ui-surface-hover block rounded-[28px] border border-primary/10 p-5 shadow-[0_18px_40px_-30px_rgba(31,77,58,0.34)] outline-none transition hover:border-secondary/35 focus-visible:ring-4 focus-visible:ring-secondary/20 ${surfaceClassName}`}
      style={getEnterStyle(motionDelay)}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
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
      <p className="mt-2 text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
};

const ProcessingMetricCard = ({
  motionDelay = 0,
  processedApplications,
  processedShare,
  remainingApplications,
  totalApplications
}: {
  motionDelay?: number;
  processedApplications: number;
  processedShare: number;
  remainingApplications: number;
  totalApplications: number;
}) => {
  return (
    <article
      className="ui-animate-in ui-surface-hover block rounded-[28px] border border-primary/10 bg-white/90 p-5 shadow-[0_18px_40px_-30px_rgba(31,77,58,0.34)] outline-none transition"
      style={getEnterStyle(motionDelay)}
      aria-label={`${processedApplications} élèves traités sur ${totalApplications}. ${remainingApplications} à traiter.`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primaryLight">
            Traitement
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {remainingApplications} à traiter
            {remainingApplications !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="ui-surface-hover__icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-white">
          <ProcessedMetricIcon className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-6 text-3xl font-semibold tracking-tight text-primaryDark">
        {processedApplications} / {totalApplications}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">
        traité{processedApplications !== 1 ? "s" : ""}
      </p>
      <div className="mt-4 overflow-hidden rounded-full bg-secondary/15 p-1">
        <div
          className="h-3 rounded-full bg-secondary shadow-[0_10px_18px_-14px_rgba(212,162,76,0.75)] transition-[width] duration-500"
          style={{ width: `${processedShare}%` }}
        />
      </div>
    </article>
  );
};

const DashboardPage = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPriorityPage, setCurrentPriorityPage] = useState(1);
  const [hoveredLevelKey, setHoveredLevelKey] = useState<string | null>(null);
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
    const priorityStudentsCount = data?.studentStats?.priorityStudents.length ?? 0;
    const totalPages = Math.max(
      1,
      Math.ceil(priorityStudentsCount / PRIORITY_DISPLAY_LIMIT)
    );

    setCurrentPriorityPage((currentPage) => Math.min(currentPage, totalPages));
  }, [data?.studentStats?.priorityStudents.length]);

  const dashboardView = useMemo(() => {
    if (!data) {
      return null;
    }

    const priorityStudents = data.studentStats?.priorityStudents ?? [];
    const priorityStudentsCount = priorityStudents.length;
    const totalPriorityPages = Math.max(
      1,
      Math.ceil(priorityStudentsCount / PRIORITY_DISPLAY_LIMIT)
    );
    const priorityStartIndex = (currentPriorityPage - 1) * PRIORITY_DISPLAY_LIMIT;
    const visiblePriorityStudents = priorityStudents.slice(
      priorityStartIndex,
      priorityStartIndex + PRIORITY_DISPLAY_LIMIT
    );

    const studentStats = data.studentStats;
    const levelStats = studentStats?.byLevel ?? data.byLevel;
    const totalStudents =
      studentStats?.totalStudents ?? levelStats.reduce((sum, level) => sum + level.count, 0);
    const acceptedStudents = studentStats?.acceptedStudents ?? data.byStatus.ACCEPTED;
    const waitlistedStudents = studentStats?.waitlistedStudents ?? data.waitlistedStudents;
    const maxLevelCount = Math.max(
      ...levelStats.map((level) => level.requestedStudentsCount ?? level.count),
      0
    );
    let chartCursor = 0;
    const levelBreakdown: LevelBreakdownItem[] = levelStats.map((level, index) => {
      const requestedStudentsCount = level.requestedStudentsCount ?? level.count;
      const share =
        totalStudents === 0 ? 0 : Math.round((requestedStudentsCount / totalStudents) * 100);
      const rawShare = totalStudents === 0 ? 0 : (requestedStudentsCount / totalStudents) * 100;
      const width =
        maxLevelCount === 0 || requestedStudentsCount === 0
          ? 0
          : Math.max((requestedStudentsCount / maxLevelCount) * 100, 6);
      const chartStart = chartCursor;
      chartCursor += rawShare;
      const chartEnd = chartCursor;
      const chartMidAngle = ((chartStart + chartEnd) / 2) * 3.6;
      const tooltipPoint = getPointOnCircle(
        LEVEL_CHART_CENTER,
        LEVEL_CHART_TOOLTIP_RADIUS,
        chartMidAngle
      );

      return {
        ...level,
        count: requestedStudentsCount,
        requestedStudentsCount,
        chartStart,
        chartEnd,
        chartMidAngle,
        share,
        tooltipX: (tooltipPoint.x / (LEVEL_CHART_CENTER * 2)) * 100,
        tooltipY: (tooltipPoint.y / (LEVEL_CHART_CENTER * 2)) * 100,
        width,
        visual: getLevelVisualStyle(level.code, level.label, index)
      };
    });
    const levelChartGradient =
      totalStudents === 0
        ? "#e2e8f0 0deg 360deg"
        : levelBreakdown
            .map((level) => {
              return `${level.visual.barColor} ${level.chartStart * 3.6}deg ${
                level.chartEnd * 3.6
              }deg`;
            })
            .join(", ");
    const topLevel = levelBreakdown.reduce<LevelBreakdownItem | null>(
      (currentTopLevel, level) => {
        if (!currentTopLevel || level.count > currentTopLevel.count) {
          return level;
        }

        return currentTopLevel;
      },
      null
    );
    const processedApplications = acceptedStudents + waitlistedStudents;
    const remainingApplications = Math.max(
      totalStudents - processedApplications,
      0
    );
    const processedShare =
      totalStudents === 0
        ? 0
        : Math.round((processedApplications / totalStudents) * 100);

    return {
      levelBreakdown,
      levelChartGradient,
      processedApplications,
      processedShare,
      priorityStudentsCount,
      remainingApplications,
      topLevel,
      totalStudents,
      acceptedStudents,
      waitlistedStudents,
      totalPriorityPages,
      visiblePriorityStudents,
      visiblePriorityStart:
        priorityStudentsCount === 0 ? 0 : priorityStartIndex + 1,
      visiblePriorityEnd: Math.min(
        currentPriorityPage * PRIORITY_DISPLAY_LIMIT,
        priorityStudentsCount
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

  if (!data || (data.studentStats?.totalStudents ?? data.totalApplications) === 0) {
    return (
      <>
        {pageHeader}
        <EmptyState
          title="Aucune donnée disponible"
          description="Le dashboard s'alimentera automatiquement dès que des élèves seront présents en base."
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
        className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent overflow-hidden rounded-[32px] border border-primary/20 bg-[#fffdf8] shadow-[0_30px_66px_-38px_rgba(31,77,58,0.42)]"
        style={getEnterStyle(190)}
      >
        <div className="border-b border-secondary/30 bg-primary px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="mt-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-secondary shadow-[0_16px_30px_-22px_rgba(0,0,0,0.55)]">
                <StatusOverviewIcon />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                  Suivi des élèves
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Élèves par statut
                </h2>
                <p className="mt-3 max-w-4xl text-[1.02rem] leading-8 text-white/80">
                  Visualisez la répartition des élèves selon leur statut de
                  traitement pour prioriser les prochaines décisions.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-6 lg:justify-end">
              <div
                className="ui-animate-in inline-flex w-fit shrink-0 flex-col rounded-[28px] border border-secondary/40 bg-secondary/20 px-7 py-5 text-center text-white shadow-[0_18px_34px_-24px_rgba(0,0,0,0.5)]"
                style={getEnterStyle(240)}
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-secondary">
                  Total
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">
                  {dashboardView.totalStudents}
                </p>
                <p className="mt-1 text-sm font-medium text-white/80">
                  élèves suivis
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#fffaf2] p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-secondary/25 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Vue active
              </span>
              <span className="inline-flex items-center rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-semibold text-primaryDark">
                {dashboardView.totalStudents} élèves
              </span>
              <span className="inline-flex items-center rounded-full border border-secondary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primaryDark">
                {dashboardView.priorityStudentsCount} prioritaires
              </span>
              <span className="inline-flex items-center rounded-full border border-secondary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primaryDark">
                {data.byLevel.length} niveaux
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ProcessingMetricCard
              motionDelay={360}
              processedApplications={dashboardView.processedApplications}
              processedShare={dashboardView.processedShare}
              remainingApplications={dashboardView.remainingApplications}
              totalApplications={dashboardView.totalStudents}
            />
            {statusCards.map((card, index) => (
              <MetricCard
                key={card.status}
                label={card.label}
                value={card.getValue ? card.getValue(data) : data.byStatus[card.status]}
                description={card.description}
                Icon={card.Icon}
                iconClassName={card.iconClassName}
                motionDelay={430 + index * 70}
                surfaceClassName={card.surfaceClassName}
                status={card.status}
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

          {data.byLevel.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
              Aucun niveau disponible.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="flex h-full flex-col rounded-[28px] border border-slate-200/90 bg-slate-50/75 p-5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.25)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Vue globale
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">
                      Répartition
                    </h3>
                  </div>
                  {dashboardView.topLevel ? (
                    <LevelBadge
                      code={dashboardView.topLevel.code}
                      label={dashboardView.topLevel.label}
                      size="md"
                    />
                  ) : null}
                </div>

                <div className="mt-6 flex justify-center">
                  <div
                    className="relative grid h-56 w-56 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08),0_24px_42px_-34px_rgba(15,23,42,0.5)]"
                    aria-label={`Répartition de ${dashboardView.totalStudents} élèves par niveau`}
                    role="img"
                  >
                    <svg
                      viewBox="0 0 224 224"
                      className="absolute inset-0 h-full w-full overflow-visible rounded-full"
                      aria-hidden="true"
                    >
                      {dashboardView.levelBreakdown.map((level) => {
                        const levelKey = `${level.code}-${level.label}`;
                        const isHovered = hoveredLevelKey === levelKey;

                        return (
                          <path
                            key={levelKey}
                            d={getDonutSegmentPath(
                              level.chartStart * 3.6,
                              level.chartEnd * 3.6
                            )}
                            fill={level.visual.barColor}
                            className="outline-none transition duration-200 hover:brightness-110 focus-visible:brightness-110"
                            style={{
                              filter: isHovered
                                ? "drop-shadow(0 12px 16px rgba(15, 23, 42, 0.18))"
                                : undefined,
                              transform: isHovered ? "scale(1.015)" : undefined,
                              transformBox: "fill-box",
                              transformOrigin: "center"
                            }}
                            tabIndex={0}
                            onMouseEnter={() => setHoveredLevelKey(levelKey)}
                            onMouseLeave={() => setHoveredLevelKey(null)}
                            onFocus={() => setHoveredLevelKey(levelKey)}
                            onBlur={() => setHoveredLevelKey(null)}
                          />
                        );
                      })}
                    </svg>

                    {dashboardView.levelBreakdown.map((level) => {
                      const levelKey = `${level.code}-${level.label}`;
                      const isHovered = hoveredLevelKey === levelKey;

                      return (
                        <div
                          key={`${levelKey}-tooltip`}
                          className={`pointer-events-none absolute z-20 min-w-[150px] rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-left shadow-[0_18px_34px_-22px_rgba(15,23,42,0.35)] backdrop-blur transition duration-150 ${
                            isHovered
                              ? "translate-y-0 scale-100 opacity-100"
                              : "translate-y-1 scale-95 opacity-0"
                          }`}
                          style={{
                            left: `${level.tooltipX}%`,
                            top: `${level.tooltipY}%`,
                            transform: `translate(-50%, -118%) ${
                              isHovered ? "scale(1)" : "scale(0.95)"
                            }`
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: level.visual.barColor }}
                            />
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {level.label}
                            </p>
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {level.count} élève{level.count > 1 ? "s" : ""}
                          </p>
                        </div>
                      );
                    })}

                    <div className="relative z-10 grid h-32 w-32 place-items-center rounded-full border border-white/90 bg-white text-center shadow-[0_16px_30px_-28px_rgba(15,23,42,0.5)]">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Total
                        </p>
                        <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">
                          {dashboardView.totalStudents}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          élèves
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {dashboardView.topLevel ? (
                  <div className="mt-6 rounded-[22px] border border-white bg-white/80 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Niveau le plus demandé
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <p className="text-lg font-semibold text-slate-900">
                        {dashboardView.topLevel.label}
                      </p>
                      <p className="text-2xl font-semibold tracking-tight text-slate-900">
                        {dashboardView.topLevel.count}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-1 flex-col rounded-[22px] border border-white bg-white/80 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Places restantes
                      </p>
                      <h4 className="mt-1 text-base font-semibold text-slate-900">
                        Capacité disponible par niveau
                      </h4>
                    </div>
                    <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold text-primaryDark">
                      Restantes
                    </span>
                  </div>

                  <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
                    {dashboardView.levelBreakdown.map((level) => {
                      const acceptedStudentsCount = level.acceptedStudentsCount ?? 0;
                      const availablePlaces = level.availablePlaces ?? 0;
                      const remainingPlaces = level.remainingPlaces ?? availablePlaces - acceptedStudentsCount;
                      const remainingRatio = getRemainingPlacesRatio(remainingPlaces, availablePlaces);
                      const isCapacityMissing = availablePlaces === 0;

                      return (
                        <div key={`${level.code}-remaining-slider`}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: level.visual.barColor }}
                              />
                              <span className="truncate text-xs font-semibold text-slate-700">
                                {level.code.toUpperCase()}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-slate-600">
                              {isCapacityMissing
                                ? "Non renseigné"
                                : `${numberFormatter.format(remainingPlaces)} / ${numberFormatter.format(availablePlaces)}`}
                            </span>
                          </div>
                          <div
                            className="relative h-2 rounded-full"
                            style={{ backgroundColor: level.visual.trackColor }}
                            aria-label={`${level.label}: ${remainingPlaces} places restantes sur ${availablePlaces}`}
                          >
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${remainingRatio}%`,
                                backgroundColor: level.visual.barColor
                              }}
                            />
                            <span
                              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_6px_12px_-8px_rgba(15,23,42,0.6)]"
                              style={{
                                left: remainingRatio === 0 ? "0" : `calc(${remainingRatio}% - 8px)`,
                                backgroundColor: isCapacityMissing ? "#94a3b8" : level.visual.barColor
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/90 bg-white/70 p-5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.18)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Détail par niveau
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">
                      Demandes, décisions et places
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Les places restantes baissent uniquement avec les élèves acceptés.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {dashboardView.levelBreakdown.map((level) => {
                    const acceptedStudentsCount = level.acceptedStudentsCount ?? 0;
                    const availablePlaces = level.availablePlaces ?? 0;
                    const remainingPlaces = level.remainingPlaces ?? availablePlaces - acceptedStudentsCount;

                    return (
                      <Link
                        key={`${level.code}-summary`}
                        to={`/students?levelId=${encodeURIComponent(level.id ?? "")}`}
                        title="Voir les élèves ayant demandé ce niveau"
                        aria-label={`Voir les élèves ayant demandé ce niveau: ${level.label}`}
                        className="group grid gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-left transition hover:border-primary/20 hover:bg-white hover:shadow-[0_16px_30px_-28px_rgba(15,23,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 xl:grid-cols-[170px_minmax(0,1fr)] xl:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: level.visual.barColor }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {level.label}
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                              {level.code.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(92px,1fr))_40px] lg:items-center">
                          {[
                            { label: "Demandes", value: level.requestedStudentsCount ?? level.count },
                            { label: "Acceptés", value: acceptedStudentsCount },
                            { label: "Places", value: availablePlaces },
                            { label: "Restantes", value: remainingPlaces }
                          ].map((metric) => {
                            const isRemainingMetric = metric.label === "Restantes";

                            return (
                            <div
                              key={metric.label}
                              className={`min-w-0 rounded-2xl border px-2.5 py-2 transition ${
                                isRemainingMetric
                                  ? "shadow-[0_12px_24px_-22px_rgba(15,23,42,0.35)]"
                                  : "border-slate-200 bg-white/80"
                              }`}
                              style={
                                isRemainingMetric
                                  ? {
                                      backgroundColor: level.visual.codeBackground,
                                      borderColor: level.visual.borderColor
                                    }
                                  : undefined
                              }
                            >
                              <p
                                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                                style={
                                  isRemainingMetric
                                    ? { color: level.visual.codeTextColor }
                                    : undefined
                                }
                              >
                                {metric.label}
                              </p>
                              <p
                                className={`mt-1 text-lg font-semibold ${
                                  isRemainingMetric ? "" : "text-slate-900"
                                }`}
                                style={
                                  isRemainingMetric
                                    ? { color: level.visual.barColor }
                                    : undefined
                                }
                              >
                                {numberFormatter.format(metric.value)}
                              </p>
                            </div>
                            );
                          })}
                          <div className="flex items-center justify-end sm:col-span-2 lg:col-span-1">
                            <span
                              aria-hidden="true"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition group-hover:border-primary/20 group-hover:text-primary"
                            >
                              <ChevronRightIcon />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </article>

        <article
          className="ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.24)]"
          style={getEnterStyle(690)}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Élèves prioritaires
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Élèves à traiter en priorité
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Conservez les situations sensibles en haut de pile avec une lecture
                rapide de la famille, des élèves concernés, du niveau demandé et
                du statut élève.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primaryDark">
              {dashboardView.priorityStudentsCount} priorité
              {dashboardView.priorityStudentsCount > 1 ? "s" : ""}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {dashboardView.priorityStudentsCount === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
                Aucun élève prioritaire pour le moment.
              </p>
            ) : (
              dashboardView.visiblePriorityStudents.map((student, index) => {
                const familyName = getPriorityStudentFamilyDisplayName(
                  student.application.family
                );

                return (
                  <article
                    key={student.id ?? `${student.firstName}-${student.lastName}-${index}`}
                    className="ui-animate-in ui-surface-hover ui-surface-hover--soft rounded-[28px] border border-slate-200/90 bg-slate-50/80 p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)] outline-none transition focus-within:ring-4 focus-within:ring-primary/20"
                    style={getEnterStyle(760 + index * 80)}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {student.firstName} {student.lastName}
                          </h3>
                          <PriorityBadge isPriority={Boolean(student.isPriority)} />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {student.application.schoolYear.label}
                          {student.application.schoolYear.isActive ? " · année active" : ""}
                        </p>
                      </div>
                      <Link
                        to={student.id ? `/students/${student.id}` : "/students?isPriority=true"}
                        className="inline-flex w-fit items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_-18px_rgba(31,77,58,0.55)] transition hover:bg-primaryDark hover:shadow-[0_16px_28px_-18px_rgba(31,77,58,0.65)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Fiche élève
                      </Link>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Élève
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold leading-6 text-slate-800">
                            {student.firstName} {student.lastName}
                          </span>
                          <StudentStatusBadge status={student.admissionStatus ?? "PENDING"} />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Niveau
                        </p>
                        <div className="mt-2">
                          <LevelBadge
                            code={student.level.code}
                            label={student.level.label}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Famille
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          Famille {familyName}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Contact
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {student.application.family.contactEmail ? (
                            <a
                              href={`mailto:${student.application.family.contactEmail}`}
                              className="break-all text-primary hover:text-primaryDark"
                            >
                              {student.application.family.contactEmail}
                            </a>
                          ) : (
                            "Non renseigné"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                        Signalé le{" "}
                        {priorityDateFormatter.format(new Date(student.application.createdAt))}
                      </span>
                      <Link
                        to={`/applications/${student.application.id}`}
                        className="rounded-full border border-secondary/35 bg-secondary/15 px-3 py-1.5 text-xs font-semibold text-secondaryDark shadow-[0_10px_20px_-18px_rgba(212,162,76,0.55)] transition hover:border-secondary hover:bg-secondary hover:text-white hover:shadow-[0_14px_24px_-18px_rgba(212,162,76,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                      >
                        Voir la famille
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {dashboardView.priorityStudentsCount > 0 ? (
            <div className="mt-6 flex justify-center border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-center gap-2">
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

          {dashboardView.priorityStudentsCount > 0 ? (
            <div className="mt-4 flex justify-center">
              <Link
                to="/students?isPriority=true"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/25 hover:text-primaryDark"
              >
                <span>Ouvrir tous les élèves prioritaires</span>
                <ChevronRightIcon />
              </Link>
            </div>
          ) : null}
        </article>
      </section>
    </>
  );
};

export default DashboardPage;
