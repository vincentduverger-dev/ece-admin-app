import { useEffect, useState } from "react";

import Breadcrumb from "../components/ui/Breadcrumb";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LoadingState from "../components/ui/LoadingState";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { fetchDashboardStats } from "../lib/api";
import type {
  DashboardApplicationStatus,
  DashboardPriorityApplication,
  DashboardStats
} from "../types/dashboard";

type StatusCardConfig = {
  status: DashboardApplicationStatus;
  label: string;
  description: string;
  valueClassName: string;
};

const statusCards: StatusCardConfig[] = [
  {
    status: "RECEIVED",
    label: "Reçues",
    description: "Demandes nouvellement importées ou enregistrées.",
    valueClassName: "text-slate-900"
  },
  {
    status: "IN_REVIEW",
    label: "En revue",
    description: "Demandes en cours d'analyse par l'administration.",
    valueClassName: "text-info"
  },
  {
    status: "ACCEPTED",
    label: "Acceptées",
    description: "Décisions favorables déjà prises.",
    valueClassName: "text-success"
  },
  {
    status: "REFUSED",
    label: "Refusées",
    description: "Demandes clôturées avec décision négative.",
    valueClassName: "text-danger"
  }
];

const createdAtFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
});

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

const getPriorityDescription = (
  application: DashboardPriorityApplication
): string => {
  if (application.students.length === 0) {
    return "Aucun élève rattaché à cette demande.";
  }

  return application.students
    .map(
      (student) => `${student.firstName} ${student.lastName} · ${student.level.label}`
    )
    .join(" | ");
};

type MetricCardProps = {
  label: string;
  value: number;
  description: string;
  valueClassName?: string;
};

const MetricCard = ({
  label,
  value,
  description,
  valueClassName = "text-primary"
}: MetricCardProps) => {
  return (
    <article className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className={`mt-4 text-4xl font-semibold ${valueClassName}`}>{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
};

const DashboardPage = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async (signal?: AbortSignal): Promise<void> => {
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
  };

  useEffect(() => {
    const controller = new AbortController();

    void loadDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  if (isLoading && !data) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <DashboardShell>
          <LoadingState variant="page" />
        </DashboardShell>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <DashboardShell>
          <ErrorState
            message={error}
            actionLabel="Réessayer"
            onAction={() => void loadDashboard()}
          />
        </DashboardShell>
      </main>
    );
  }

  if (!data || data.totalApplications === 0) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <DashboardShell>
          <EmptyState
            title="Aucune donnée disponible"
            description="Le dashboard s'alimentera automatiquement dès qu'une demande et des élèves seront présents en base."
          />
        </DashboardShell>
      </main>
    );
  }

  const maxLevelCount = Math.max(...data.byLevel.map((level) => level.count), 0);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <DashboardShell>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Demandes totales"
            value={data.totalApplications}
            description="Volume global des demandes présentes dans la base seedée."
          />
          {statusCards.map((card) => (
            <MetricCard
              key={card.status}
              label={card.label}
              value={data.byStatus[card.status]}
              description={card.description}
              valueClassName={card.valueClassName}
            />
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1.45fr]">
          <article className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                  Répartition par niveau
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Élèves par classe demandée
                </h2>
              </div>
              <div className="rounded-full bg-secondary/15 px-4 py-2 text-sm font-medium text-secondaryDark">
                {data.byLevel.reduce((sum, level) => sum + level.count, 0)} élèves
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {data.byLevel.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
                  Aucun niveau disponible.
                </p>
              ) : (
                data.byLevel.map((level) => {
                  const width =
                    maxLevelCount === 0 ? 0 : (level.count / maxLevelCount) * 100;

                  return (
                    <div key={level.code} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{level.label}</p>
                          <p className="text-sm text-slate-500">{level.code}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          {level.count}
                        </p>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
                  Demandes prioritaires
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Dossiers à traiter en priorité
                </h2>
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
                data.priorityApplications.map((application) => (
                  <article
                    key={application.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
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
                      <StatusBadge status={application.status} />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {getPriorityDescription(application)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {application.students.map((student) => (
                        <span
                          key={`${application.id}-${student.firstName}-${student.lastName}-${student.level.code}`}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                        >
                          {student.firstName} {student.lastName} · {student.level.code}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500">
                      <span>
                        Contact : {application.family.contactEmail ?? "non renseigné"}
                      </span>
                      <span>Créée le {createdAtFormatter.format(new Date(application.createdAt))}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>
        </section>
      </DashboardShell>
    </main>
  );
};

const DashboardShell = ({ children }: { children: React.ReactNode }) => {
  const { logout } = useAuth();

  const handleLogout = (): void => {
    logout();
    window.location.replace("/login");
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      <div className="absolute inset-x-0 top-0 -z-10 h-56 rounded-[2rem] bg-gradient-to-r from-secondary/15 via-white/30 to-primary/10 blur-3xl" />
      <header className="mb-8 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/" },
            { label: "Dashboard" }
          ]}
        />
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-primaryLight">
          Dashboard Admin
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Vue d&apos;ensemble des demandes d&apos;inscription
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Première version branchée sur l&apos;API réelle pour suivre le volume
              global, les statuts, la répartition des élèves et les dossiers
              prioritaires.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <a
                href="/applications"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark"
              >
                Ouvrir les demandes
              </a>
              <a
                href="/imports/new"
                className="inline-flex items-center rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secondaryDark"
              >
                Importer un CSV
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Déconnexion provisoire
              </button>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primaryDark">
              Source : <span className="font-semibold">GET /api/dashboard/stats</span>
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
};

export default DashboardPage;
