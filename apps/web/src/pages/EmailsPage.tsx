import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";

import PageSectionHeader from "../components/layout/PageSectionHeader";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LoadingState from "../components/ui/LoadingState";
import StatusBadge from "../components/ui/StatusBadge";
import { getReadyEmailApplications } from "../lib/api";
import { applicationEmailTypeLabels } from "../lib/applicationEmail";
import type {
  ReadyEmailApplication,
  ReadyEmailApplicationStudent,
  ReadyEmailType
} from "../types/application";

type EmailFilter = "ALL" | ReadyEmailType | "UNSENT" | "SENT";

type FilterOption = {
  label: string;
  value: EmailFilter;
};

const filterOptions: FilterOption[] = [
  { value: "ALL", label: "Toutes" },
  { value: "ACCEPTANCE", label: "Acceptation" },
  { value: "WAITLIST", label: "Liste d'attente" },
  { value: "PARTIAL_DECISION", label: "Décision partielle" },
  { value: "UNSENT", label: "Non envoyées" },
  { value: "SENT", label: "Déjà envoyées" }
];

const emailTypeBadgeStyles: Record<ReadyEmailType, string> = {
  ACCEPTANCE: "bg-success/15 text-success ring-success/20",
  WAITLIST: "bg-info/15 text-info ring-info/20",
  PARTIAL_DECISION: "bg-secondary/15 text-secondaryDark ring-secondary/25"
};

const studentStatusLabels: Record<ReadyEmailApplicationStudent["admissionStatus"], string> = {
  ACCEPTED: "Accepté",
  WAITLISTED: "Liste d'attente"
};

const studentStatusStyles: Record<ReadyEmailApplicationStudent["admissionStatus"], string> = {
  ACCEPTED: "bg-success/15 text-success ring-success/20",
  WAITLISTED: "bg-info/15 text-info ring-info/20"
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
});

const normalizeSearchText = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
};

const formatOptionalDateTime = (value: string | null): string => {
  return value ? dateTimeFormatter.format(new Date(value)) : "Non envoyé";
};

const formatParentName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null => {
  const parts = [firstName, lastName].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0
  );

  return parts.length > 0 ? parts.join(" ") : null;
};

const getFamilyTitle = (application: ReadyEmailApplication): string => {
  const parents = [
    formatParentName(
      application.family.fatherFirstName,
      application.family.fatherLastName
    ),
    formatParentName(
      application.family.motherFirstName,
      application.family.motherLastName
    )
  ].filter((value): value is string => value !== null);

  if (parents.length > 0) {
    return parents.join(" / ");
  }

  const firstStudent = application.students[0];

  return firstStudent
    ? `Famille ${firstStudent.lastName}`
    : "Famille non renseignée";
};

const getApplicationSearchText = (application: ReadyEmailApplication): string => {
  return normalizeSearchText(
    [
      getFamilyTitle(application),
      application.family.contactEmail,
      application.family.contactPhone,
      ...application.students.flatMap((student) => [
        student.firstName,
        student.lastName,
        student.level.code,
        student.level.label
      ])
    ]
      .filter(Boolean)
      .join(" ")
  );
};

const SummaryCard = ({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "info" | "gold";
}) => {
  const toneClassNames = {
    default: "border-primary/10 bg-white text-primaryDark",
    success: "border-success/20 bg-success/10 text-success",
    info: "border-info/20 bg-info/10 text-info",
    gold: "border-secondary/30 bg-secondary/15 text-secondaryDark"
  };

  return (
    <article className={`rounded-[26px] border p-5 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.35)] ${toneClassNames[tone]}`}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em]">
        {label}
      </p>
    </article>
  );
};

const EmailsPage = () => {
  const [applications, setApplications] = useState<ReadyEmailApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EmailFilter>("ALL");

  useEffect(() => {
    const controller = new AbortController();

    const loadApplications = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const readyApplications = await getReadyEmailApplications(
          {},
          { signal: controller.signal }
        );

        setApplications(readyApplications);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les demandes prêtes pour email."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadApplications();

    return () => {
      controller.abort();
    };
  }, []);

  const summary = useMemo(() => {
    return {
      total: applications.length,
      accepted: applications.filter(
        (application) => application.recommendedEmailType === "ACCEPTANCE"
      ).length,
      waitlisted: applications.filter(
        (application) => application.recommendedEmailType === "WAITLIST"
      ).length,
      partial: applications.filter(
        (application) => application.recommendedEmailType === "PARTIAL_DECISION"
      ).length,
      sent: applications.filter((application) => application.hasSentEmail).length
    };
  }, [applications]);

  const displayedApplications = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search.trim());

    return applications.filter((application) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "UNSENT" && !application.hasSentEmail) ||
        (filter === "SENT" && application.hasSentEmail) ||
        application.recommendedEmailType === filter;

      if (!matchesFilter) {
        return false;
      }

      return (
        normalizedSearch.length === 0 ||
        getApplicationSearchText(application).includes(normalizedSearch)
      );
    });
  }, [applications, filter, search]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.target.value);
  };

  if (isLoading) {
    return (
      <>
        <PageSectionHeader
          eyebrow="E-mail"
          title="E-mails de décision"
          description="Demandes prêtes pour l'envoi aux familles."
        />
        <LoadingState />
      </>
    );
  }

  if (error && applications.length === 0) {
    return (
      <>
        <PageSectionHeader
          eyebrow="E-mail"
          title="E-mails de décision"
          description="Demandes prêtes pour l'envoi aux familles."
        />
        <ErrorState
          message={error}
          actionLabel="Réessayer"
          onAction={() => window.location.reload()}
        />
      </>
    );
  }

  return (
    <>
      <PageSectionHeader
        eyebrow="E-mail"
        title="E-mails de décision"
        description="Demandes prêtes pour l'envoi aux familles."
        aside={
          <span className="rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primaryDark">
            {displayedApplications.length} dossier{displayedApplications.length > 1 ? "s" : ""}
          </span>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Prêtes" value={summary.total} />
        <SummaryCard label="Acceptées" value={summary.accepted} tone="success" />
        <SummaryCard label="En attente" value={summary.waitlisted} tone="info" />
        <SummaryCard label="Partielles" value={summary.partial} tone="gold" />
        <SummaryCard label="Déjà envoyées" value={summary.sent} tone="default" />
      </section>

      <section className="mt-6 overflow-hidden rounded-[30px] border border-primary/15 bg-white/90 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.32)]">
        <div className="border-b border-secondary/25 bg-[#fffaf2] px-5 py-5 sm:px-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] xl:items-center">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primaryLight">
                Recherche
              </span>
              <input
                type="search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Famille, enfant ou email..."
                className="mt-2 h-12 w-full rounded-2xl border border-primary/15 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filter === option.value
                      ? "bg-secondary text-white shadow-[0_12px_24px_-18px_rgba(212,162,76,0.95)]"
                      : "border border-primary/15 bg-white text-primaryDark hover:border-secondary/40 hover:bg-secondary/10"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mx-5 mt-5 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-slate-700 sm:mx-6">
            {error} Les derniers résultats chargés restent affichés.
          </p>
        ) : null}

        <div className="p-5 sm:p-6">
          {applications.length === 0 ? (
            <EmptyState
              title="Aucune demande prête pour l'envoi"
              description="Les demandes apparaîtront ici lorsque tous les enfants auront une décision."
            />
          ) : displayedApplications.length === 0 ? (
            <EmptyState
              title="Aucun résultat"
              description="Aucune demande prête ne correspond à cette recherche ou à ce filtre."
            />
          ) : (
            <div className="space-y-4">
              {displayedApplications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-[26px] border border-slate-200/90 bg-white p-5 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {getFamilyTitle(application)}
                        </h2>
                        <StatusBadge status={application.status} />
                      </div>
                      <p className="mt-2 break-all text-sm font-medium text-slate-600">
                        {application.family.contactEmail || "Email non renseigné"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {application.students.length} enfant{application.students.length > 1 ? "s" : ""} concerné{application.students.length > 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${emailTypeBadgeStyles[application.recommendedEmailType]}`}>
                        {applicationEmailTypeLabels[application.recommendedEmailType]}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${
                        application.hasSentEmail
                          ? "bg-success/10 text-success ring-success/20"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}>
                        {application.hasSentEmail
                          ? `Email déjà envoyé · ${formatOptionalDateTime(application.lastEmailSentAt)}`
                          : "Email non envoyé"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {application.students.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ring-1 ${studentStatusStyles[student.admissionStatus]}`}>
                            {studentStatusLabels[student.admissionStatus]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {student.level.label} · {student.level.code}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <Link
                      to={`/applications/${application.id}/email`}
                      className="inline-flex items-center rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secondaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                    >
                      Préparer l'e-mail
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default EmailsPage;
