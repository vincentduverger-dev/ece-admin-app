import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import { Link, useParams } from "react-router-dom";

import PageSectionHeader from "../components/layout/PageSectionHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import ErrorState from "../components/ui/ErrorState";
import LevelBadge from "../components/ui/LevelBadge";
import LoadingState from "../components/ui/LoadingState";
import PersonAvatar, {
  FamilyAvatar,
  type PersonAvatarVariant
} from "../components/ui/PersonAvatar";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { useToast } from "../context/ToastContext";
import {
  getApplicationById,
  getApplicationEmailLogs,
  updateApplicationDecision,
  updateApplicationPriority,
  updateApplicationStatus,
  updateStudentAdmissionStatus
} from "../lib/api";
import {
  applicationEmailSendStatusLabels,
  applicationEmailSendStatusStyles,
  applicationEmailTypeLabels,
  applicationEmailTypeStyles
} from "../lib/applicationEmail";
import type {
  ApplicationDecisionStatus,
  ApplicationDetail,
  ApplicationDetailStudent,
  ApplicationEmailLog,
  ApplicationGender,
  ApplicationStatus,
  StudentAdmissionStatus
} from "../types/application";

type IconProps = {
  className?: string;
};

type DetailFieldProps = {
  children: ReactNode;
  className?: string;
  label: string;
};

type SectionCardProps = {
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  motionDelay?: number;
  subtitle?: string;
  title: string;
};

type TimelineEntry = {
  badges?: ReactNode;
  content?: string;
  date: string;
  id: string;
  sortDate: number;
  summary: string;
  type: string;
};

const genderLabels: Record<ApplicationGender, string> = {
  BOY: "Garçon",
  GIRL: "Fille",
  UNKNOWN: "Non renseigné"
};

const statusOptions: Array<{
  value: ApplicationStatus;
  label: string;
}> = [
  { value: "RECEIVED", label: "Reçue" },
  { value: "IN_REVIEW", label: "En revue" },
  { value: "ACCEPTED", label: "Acceptée" },
  { value: "REFUSED", label: "Refusée" },
  { value: "PARTIALLY_ACCEPTED", label: "Décision partielle" }
];

const decisionOptions: Array<{
  value: ApplicationDecisionStatus;
  label: string;
}> = [
  { value: "ACCEPTED", label: "Acceptée" },
  { value: "REFUSED", label: "Refusée" }
];

const studentAdmissionStatusOptions: Array<{
  value: StudentAdmissionStatus;
  label: string;
}> = [
  { value: "ACCEPTED", label: "Accepter" },
  { value: "REFUSED", label: "Refuser" },
  { value: "WAITLISTED", label: "Liste d'attente" },
  { value: "PENDING", label: "Remettre en attente" }
];

const studentAdmissionStatusLabels: Record<StudentAdmissionStatus, string> = {
  PENDING: "En attente",
  ACCEPTED: "Accepté",
  REFUSED: "Refusé",
  WAITLISTED: "Liste d'attente"
};

const studentAdmissionStatusStyles: Record<StudentAdmissionStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
  ACCEPTED: "bg-success/15 text-success ring-success/20",
  REFUSED: "bg-danger/15 text-danger ring-danger/20",
  WAITLISTED: "bg-info/15 text-info ring-info/20"
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium"
});

const getEnterStyle = (delay: number): CSSProperties => {
  return {
    "--ui-enter-delay": `${delay}ms`
  } as CSSProperties;
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const isDecisionStatus = (
  status: ApplicationStatus
): status is ApplicationDecisionStatus => {
  return status === "ACCEPTED" || status === "REFUSED";
};

const getDecisionSelection = (
  status: ApplicationStatus
): ApplicationDecisionStatus => {
  return isDecisionStatus(status) ? status : "ACCEPTED";
};

const formatSchoolYearLabel = (label: string): string => {
  return label.replace(/^(\d{4})-(\d{4})$/u, "$1 - $2");
};

const formatOptionalText = (value: string | null | undefined): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return "Non renseigné";
};

const formatOptionalDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return "Non renseigné";
  }

  return dateTimeFormatter.format(new Date(value));
};

const formatOptionalDate = (value: string | null | undefined): string => {
  if (!value) {
    return "Non renseigné";
  }

  return dateFormatter.format(new Date(value));
};

const formatParentName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string => {
  const parts = [firstName, lastName].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0
  );

  return parts.length > 0 ? parts.join(" ") : "Non renseigné";
};

const getActionErrorMessage = (fallbackMessage: string, error: unknown): string => {
  if (!(error instanceof Error) || error.message.trim().length === 0) {
    return fallbackMessage;
  }

  if (error.message === fallbackMessage) {
    return fallbackMessage;
  }

  return `${fallbackMessage} ${error.message}`;
};

const getApplicationFamilyTitle = (
  application: ApplicationDetail | null
): string => {
  if (!application) {
    return "Chargement du détail";
  }

  const familyNames = [
    formatParentName(
      application.family.fatherFirstName,
      application.family.fatherLastName
    ),
    formatParentName(
      application.family.motherFirstName,
      application.family.motherLastName
    )
  ].filter((value, index, values) => {
    return value !== "Non renseigné" && values.indexOf(value) === index;
  });

  if (familyNames.length > 0) {
    return `Famille ${familyNames.join(" / ")}`;
  }

  const studentLastNames = application.students
    .map((student) => student.lastName.trim())
    .filter((value) => value.length > 0);

  if (studentLastNames.length > 0) {
    return `Famille ${Array.from(new Set(studentLastNames)).join(" / ")}`;
  }

  return "Famille non renseignée";
};

const getFamilyLastNameTitle = (application: ApplicationDetail): string => {
  const parentLastNames = [
    application.family.fatherLastName,
    application.family.motherLastName
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0
  );
  const studentLastNames = application.students
    .map((student) => student.lastName.trim())
    .filter((value) => value.length > 0);
  const lastNames =
    parentLastNames.length > 0 ? parentLastNames : studentLastNames;
  const uniqueLastNames = Array.from(new Set(lastNames.map((value) => value.trim())));

  return uniqueLastNames.length > 0
    ? uniqueLastNames.join(" / ")
    : "Famille non renseignée";
};

const getApplicationLevels = (
  application: ApplicationDetail
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

const getStudentsSummary = (students: ApplicationDetailStudent[]): string => {
  if (students.length === 0) {
    return "Aucun élève rattaché";
  }

  return students
    .map((student) => `${student.firstName} ${student.lastName}`)
    .join(" · ");
};

const getHeaderDescription = (application: ApplicationDetail | null): string => {
  if (!application) {
    return "Consultation et traitement administratif d'une demande d'inscription.";
  }

  const studentsSummary = getStudentsSummary(application.students);

  return `${studentsSummary} · ${formatSchoolYearLabel(
    application.schoolYear.label
  )} · consultation et traitement du dossier.`;
};

const getDecisionSummary = (status: ApplicationDecisionStatus): string => {
  return status === "ACCEPTED" ? "Acceptation enregistrée" : "Refus enregistré";
};

const getStudentAdmissionStatus = (
  student: ApplicationDetailStudent
): StudentAdmissionStatus => {
  return student.admissionStatus ?? "PENDING";
};

const getStudentAdmissionCounts = (students: ApplicationDetailStudent[]) => {
  return students.reduce(
    (counts, student) => {
      counts[getStudentAdmissionStatus(student)] += 1;

      return counts;
    },
    {
      PENDING: 0,
      ACCEPTED: 0,
      REFUSED: 0,
      WAITLISTED: 0
    } satisfies Record<StudentAdmissionStatus, number>
  );
};

const getStudentAdmissionSummary = (students: ApplicationDetailStudent[]): string => {
  const counts = getStudentAdmissionCounts(students);

  return `${counts.ACCEPTED} accepté${counts.ACCEPTED > 1 ? "s" : ""} · ${
    counts.REFUSED
  } refusé${counts.REFUSED > 1 ? "s" : ""} · ${counts.WAITLISTED} en liste d'attente · ${
    counts.PENDING
  } en attente`;
};

const BackIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      className={className}
    >
      <path d="m9.75 3.25-4.5 4.75 4.5 4.75" />
    </svg>
  );
};

const MailIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      className={className}
    >
      <rect x="2" y="3.25" width="12" height="9.5" rx="2" />
      <path d="M3.25 5 8 8.5 12.75 5" />
    </svg>
  );
};

const SaveIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      className={className}
    >
      <path d="M3.25 2.75h7.6l1.9 1.9v8.6h-9.5V2.75Z" />
      <path d="M5.25 2.75v3h5.5" />
      <path d="M5.5 11.25h5" />
    </svg>
  );
};

const StarIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="m8 2.15 1.62 3.28 3.62.52-2.62 2.55.62 3.6L8 10.4l-3.24 1.7.62-3.6L2.76 5.95l3.62-.52L8 2.15Z" />
    </svg>
  );
};

const DetailField = ({ label, children, className }: DetailFieldProps) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white/80 p-4 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.18)] ${className ?? ""}`}
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
        {children}
      </div>
    </div>
  );
};

const SectionCard = ({
  title,
  subtitle,
  action,
  children,
  bodyClassName,
  className,
  motionDelay = 0
}: SectionCardProps) => {
  return (
    <section
      className={`ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)] backdrop-blur sm:p-7 ${className ?? ""}`}
      style={getEnterStyle(motionDelay)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={`mt-6 ${bodyClassName ?? ""}`}>{children}</div>
    </section>
  );
};

const ParentCard = ({
  name,
  role,
  variant
}: {
  name: string;
  role: string;
  variant: PersonAvatarVariant;
}) => {
  return (
    <article className="rounded-[26px] border border-slate-200/90 bg-slate-50/80 p-4">
      <div className="flex items-center gap-4">
        <PersonAvatar label={`${role} - ${name}`} size="md" variant={variant} />
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {role}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold text-slate-900">
            {name}
          </h3>
        </div>
      </div>
    </article>
  );
};

const StudentAdmissionBadge = ({
  status
}: {
  status: StudentAdmissionStatus;
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${studentAdmissionStatusStyles[status]}`}
    >
      {studentAdmissionStatusLabels[status]}
    </span>
  );
};

const buildTimelineEntries = (
  application: ApplicationDetail,
  emailLogs: ApplicationEmailLog[]
): TimelineEntry[] => {
  const createdAt = new Date(application.createdAt);
  const entries: TimelineEntry[] = [
    {
      id: `${application.id}-created`,
      type: "Demande reçue",
      date: formatOptionalDateTime(application.createdAt),
      sortDate: createdAt.getTime(),
      summary: `Dossier créé pour ${getStudentsSummary(application.students)}.`,
      content: `Année scolaire ${formatSchoolYearLabel(application.schoolYear.label)}.`
    }
  ];

  if (application.decisionAt && isDecisionStatus(application.status)) {
    entries.push({
      id: `${application.id}-decision`,
      type: "Décision finale",
      date: formatOptionalDateTime(application.decisionAt),
      sortDate: new Date(application.decisionAt).getTime(),
      summary: getDecisionSummary(application.status),
      content: application.decisionNote ?? undefined,
      badges: <StatusBadge status={application.status} />
    });
  }

  emailLogs.forEach((emailLog) => {
    const timelineDate = emailLog.sentAt ?? emailLog.createdAt;

    entries.push({
      id: emailLog.id,
      type: `Email ${applicationEmailTypeLabels[emailLog.emailType].toLowerCase()}`,
      date: formatOptionalDateTime(timelineDate),
      sortDate: new Date(timelineDate).getTime(),
      summary: emailLog.subject,
      content: emailLog.bodySnapshot,
      badges: (
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${applicationEmailTypeStyles[emailLog.emailType]}`}
          >
            {applicationEmailTypeLabels[emailLog.emailType]}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${applicationEmailSendStatusStyles[emailLog.sendStatus]}`}
          >
            {applicationEmailSendStatusLabels[emailLog.sendStatus]}
          </span>
        </div>
      )
    });
  });

  return entries.sort((leftEntry, rightEntry) => rightEntry.sortDate - leftEntry.sortDate);
};

const ApplicationDetailPage = () => {
  const { id: applicationId } = useParams<{ id: string }>();
  const { showError, showSuccess } = useToast();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [emailLogs, setEmailLogs] = useState<ApplicationEmailLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>("RECEIVED");
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [isPrioritySubmitting, setIsPrioritySubmitting] = useState(false);
  const [selectedDecisionStatus, setSelectedDecisionStatus] =
    useState<ApplicationDecisionStatus>("ACCEPTED");
  const [decisionNote, setDecisionNote] = useState("");
  const [isDecisionSubmitting, setIsDecisionSubmitting] = useState(false);
  const [updatingStudentAdmissionId, setUpdatingStudentAdmissionId] =
    useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadApplicationDetail = async (): Promise<void> => {
      if (!applicationId) {
        setApplication(null);
        setEmailLogs([]);
        setError("Application not found");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [applicationData, emailLogsData] = await Promise.all([
          getApplicationById(applicationId, { signal: controller.signal }),
          getApplicationEmailLogs(applicationId, { signal: controller.signal })
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setApplication(applicationData);
        setEmailLogs(emailLogsData);
        setSelectedDecisionStatus(getDecisionSelection(applicationData.status));
        setDecisionNote(applicationData.decisionNote ?? "");
      } catch (loadError) {
        if (isAbortError(loadError) || controller.signal.aborted) {
          return;
        }

        setApplication(null);
        setEmailLogs([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Une erreur inattendue est survenue."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadApplicationDetail();

    return () => {
      controller.abort();
    };
  }, [applicationId]);

  useEffect(() => {
    if (application) {
      setSelectedStatus(application.status);
    }
  }, [application]);

  const handleStatusSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (!application || selectedStatus === application.status) {
        return;
      }

      setIsStatusSubmitting(true);

      try {
        const updatedApplication = await updateApplicationStatus(
          application.id,
          selectedStatus
        );

        setApplication((currentApplication) => {
          if (!currentApplication || currentApplication.id !== updatedApplication.id) {
            return currentApplication;
          }

          return {
            ...currentApplication,
            status: updatedApplication.status
          };
        });
        if (isDecisionStatus(updatedApplication.status)) {
          setSelectedDecisionStatus(updatedApplication.status);
        }
        showSuccess("Le statut a bien été mis à jour.");
      } catch (updateError) {
        showError(
          getActionErrorMessage("Impossible de mettre à jour le statut.", updateError)
        );
      } finally {
        setIsStatusSubmitting(false);
      }
    },
    [application, selectedStatus, showError, showSuccess]
  );

  const handlePriorityToggle = useCallback(async (): Promise<void> => {
    if (!application) {
      return;
    }

    const nextPriorityValue = !application.isPriority;

    setIsPrioritySubmitting(true);

    try {
      const updatedApplication = await updateApplicationPriority(
        application.id,
        nextPriorityValue
      );

      setApplication((currentApplication) => {
        if (!currentApplication || currentApplication.id !== updatedApplication.id) {
          return currentApplication;
        }

        return {
          ...currentApplication,
          isPriority: updatedApplication.isPriority
        };
      });
      showSuccess(
        nextPriorityValue
          ? "La demande est maintenant prioritaire."
          : "La priorité a été retirée."
      );
    } catch (updateError) {
      showError(
        getActionErrorMessage(
          "Impossible de mettre à jour la priorité.",
          updateError
        )
      );
    } finally {
      setIsPrioritySubmitting(false);
    }
  }, [application, showError, showSuccess]);

  const handleDecisionSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (!application) {
        return;
      }

      setIsDecisionSubmitting(true);

      const normalizedDecisionNote = decisionNote.trim();

      try {
        const updatedApplication = await updateApplicationDecision(application.id, {
          status: selectedDecisionStatus,
          decisionNote:
            normalizedDecisionNote.length > 0 ? normalizedDecisionNote : null
        });

        setApplication((currentApplication) => {
          if (!currentApplication || currentApplication.id !== updatedApplication.id) {
            return currentApplication;
          }

          return {
            ...currentApplication,
            status: updatedApplication.status,
            decisionAt: updatedApplication.decisionAt,
            decisionNote: updatedApplication.decisionNote,
            students: currentApplication.students.map((student) => ({
              ...student,
              admissionStatus: updatedApplication.status
            }))
          };
        });
        setSelectedDecisionStatus(updatedApplication.status);
        setDecisionNote(updatedApplication.decisionNote ?? "");
        showSuccess("La décision finale a bien été enregistrée.");
      } catch (updateError) {
        showError(
          getActionErrorMessage(
            "Impossible d'enregistrer la décision finale.",
            updateError
          )
        );
      } finally {
        setIsDecisionSubmitting(false);
      }
    },
    [application, decisionNote, selectedDecisionStatus, showError, showSuccess]
  );

  const handleStudentAdmissionStatusUpdate = useCallback(
    async (
      studentId: string,
      admissionStatus: StudentAdmissionStatus
    ): Promise<void> => {
      if (!application) {
        return;
      }

      setUpdatingStudentAdmissionId(studentId);

      try {
        const updateResult = await updateStudentAdmissionStatus(
          studentId,
          admissionStatus
        );

        setApplication((currentApplication) => {
          if (!currentApplication) {
            return currentApplication;
          }

          return {
            ...currentApplication,
            status: updateResult.applicationStatus,
            students: currentApplication.students.map((student) =>
              student.id === updateResult.student.id
                ? {
                    ...student,
                    admissionStatus: updateResult.student.admissionStatus
                  }
                : student
            )
          };
        });
        showSuccess("La décision de l'élève a bien été mise à jour.");
      } catch (updateError) {
        showError(
          getActionErrorMessage(
            "Impossible de mettre à jour la décision de l'élève.",
            updateError
          )
        );
      } finally {
        setUpdatingStudentAdmissionId(null);
      }
    },
    [application, showError, showSuccess]
  );

  const pageTopBar = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div
        className="ui-animate-in ui-animate-in--subtle w-fit rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-primaryDark shadow-[0_10px_22px_-22px_rgba(15,23,42,0.18)]"
        style={getEnterStyle(20)}
      >
        <Breadcrumb
          items={[
            { label: "Tableau de bord", href: "/" },
            { label: "Liste des demandes", href: "/applications" },
            { label: "Détail" }
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <Link
          to="/applications"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary"
        >
          <BackIcon />
          <span>Retour aux demandes</span>
        </Link>
      </div>
    </div>
  );

  const pageHeaderAside = application ? (
    <div className="flex flex-wrap items-center gap-2">
      <PriorityBadge isPriority={application.isPriority} />
      <StatusBadge status={application.status} />
    </div>
  ) : isLoading ? (
    <span className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm text-primaryDark">
      Chargement...
    </span>
  ) : null;

  if (isLoading) {
    return (
      <>
        <PageSectionHeader
          topBar={pageTopBar}
          eyebrow="Demande d'inscription"
          title={getApplicationFamilyTitle(null)}
          description={getHeaderDescription(null)}
          aside={pageHeaderAside}
        />
        <LoadingState />
      </>
    );
  }

  if (error || !application) {
    const errorMessage = error ?? "Application not found";
    const isApplicationNotFound = errorMessage === "Application not found";

    return (
      <>
        <PageSectionHeader
          topBar={pageTopBar}
          eyebrow="Demande d'inscription"
          title={getApplicationFamilyTitle(null)}
          description={getHeaderDescription(null)}
          aside={pageHeaderAside}
        />
        <ErrorState
          title={isApplicationNotFound ? "Demande introuvable" : undefined}
          message={
            isApplicationNotFound
              ? "Revenez à la liste des demandes et vérifiez l'identifiant ciblé."
              : errorMessage
          }
          actionLabel={isApplicationNotFound ? undefined : "Actualiser"}
          onAction={
            isApplicationNotFound ? undefined : () => window.location.reload()
          }
          backLink="/applications"
        />
      </>
    );
  }

  const timelineEntries = buildTimelineEntries(application, emailLogs);
  const familyLastNameTitle = getFamilyLastNameTitle(application);
  const familyAvatarLabel =
    familyLastNameTitle === "Famille non renseignée"
      ? familyLastNameTitle
      : `Famille ${familyLastNameTitle}`;
  const applicationLevels = getApplicationLevels(application);
  const fatherName = formatParentName(
    application.family.fatherFirstName,
    application.family.fatherLastName
  );
  const motherName = formatParentName(
    application.family.motherFirstName,
    application.family.motherLastName
  );

  return (
    <>
      <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(120)}>
        <PageSectionHeader
          topBar={pageTopBar}
          eyebrow="Demande d'inscription"
          title={getApplicationFamilyTitle(application)}
          description={getHeaderDescription(application)}
          aside={pageHeaderAside}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] xl:items-start">
        <SectionCard
          title="Informations principales"
          subtitle="Repères essentiels du dossier avant traitement administratif."
          className="xl:col-start-1 xl:row-start-1"
          motionDelay={180}
        >
            <div className="rounded-[28px] border border-primary/10 bg-primary/5 p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <FamilyAvatar label={familyAvatarLabel} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primaryLight">
                    Famille
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    {familyLastNameTitle}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={application.status} />
                    <PriorityBadge isPriority={application.isPriority} />
                    {applicationLevels.length > 0 ? (
                      applicationLevels.map((level) => (
                        <LevelBadge
                          key={`${level.code}-${level.label}`}
                          code={level.code}
                          label={level.label}
                          size="sm"
                        />
                      ))
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailField label="Identifiant">{application.id}</DetailField>
              <DetailField label="Réception">
                {formatOptionalDateTime(application.createdAt)}
              </DetailField>
              <DetailField label="Année scolaire">
                {formatSchoolYearLabel(application.schoolYear.label)}
              </DetailField>
              <DetailField label="Élèves rattachés">
                {application.students.length}
              </DetailField>
              <DetailField label="Décision prise le">
                {formatOptionalDateTime(application.decisionAt)}
              </DetailField>
              <DetailField label="Note de décision">
                {formatOptionalText(application.decisionNote)}
              </DetailField>
            </div>
        </SectionCard>

        <SectionCard
          title="Famille"
          subtitle="Parents et coordonnées à utiliser pour le suivi administratif."
          className="xl:col-start-1 xl:row-start-2"
          motionDelay={240}
        >
            <div className="grid gap-4 md:grid-cols-2">
              <ParentCard name={fatherName} role="Père" variant="man" />
              <ParentCard name={motherName} role="Mère" variant="woman" />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailField label="Email de contact">
                {formatOptionalText(application.family.contactEmail)}
              </DetailField>
              <DetailField label="Téléphone">
                {formatOptionalText(application.family.contactPhone)}
              </DetailField>
              <DetailField label="Situation familiale">
                {formatOptionalText(application.family.familyStatus)}
              </DetailField>
              <DetailField label="Adresse postale">
                {formatOptionalText(application.family.postalAddress)}
              </DetailField>
            </div>
        </SectionCard>

        <div className="space-y-6 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:min-h-0 xl:self-stretch xl:[contain:size]">
          <SectionCard
            title="Traitement"
            subtitle="Statut, priorité, décision finale et email."
            bodyClassName="!mt-4 flex flex-1 flex-col gap-3 xl:min-h-0"
            className="!p-5 sm:!p-6 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
            motionDelay={220}
          >
            <form className="shrink-0" onSubmit={handleStatusSubmit}>
              <div className="rounded-[22px] border border-slate-200/90 bg-slate-50/80 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Statut actuel
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge status={application.status} />
                    </div>
                  </div>
                  <select
                    id="application-status"
                    aria-label="Nouveau statut"
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value as ApplicationStatus)
                    }
                    disabled={isStatusSubmitting}
                    className="min-w-[170px] rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isStatusSubmitting || selectedStatus === application.status}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <SaveIcon />
                  <span>
                    {isStatusSubmitting ? "Mise à jour..." : "Mettre à jour"}
                  </span>
                </button>
              </div>
            </form>

            <div className="shrink-0 rounded-[22px] border border-slate-200/90 bg-slate-50/80 p-3.5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Décision des élèves
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                {getStudentAdmissionSummary(application.students)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-600">
                  Statut global :
                </span>
                <StatusBadge status={application.status} />
              </div>
            </div>

            <div className="shrink-0 rounded-[22px] border border-slate-200/90 bg-slate-50/80 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Priorité
                  </p>
                  <div className="mt-1.5">
                    {application.isPriority ? (
                      <PriorityBadge isPriority={application.isPriority} />
                    ) : (
                      <span className="text-sm font-medium text-slate-600">
                        Non prioritaire
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePriorityToggle}
                  disabled={isPrioritySubmitting}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <StarIcon />
                  <span>
                    {isPrioritySubmitting
                      ? "Mise à jour..."
                      : application.isPriority
                        ? "Retirer"
                        : "Activer"}
                  </span>
                </button>
              </div>
            </div>

            <form
              className="shrink-0 rounded-[22px] border border-slate-200/90 bg-slate-50/80 p-3.5"
              onSubmit={handleDecisionSubmit}
            >
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Décision finale
                </p>
              </div>

              <div className="mt-3 space-y-1.5">
                <label
                  htmlFor="application-decision-status"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Décision
                </label>
                <select
                  id="application-decision-status"
                  value={selectedDecisionStatus}
                  onChange={(event) =>
                    setSelectedDecisionStatus(
                      event.target.value as ApplicationDecisionStatus
                    )
                  }
                  disabled={isDecisionSubmitting}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {decisionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 space-y-1.5">
                <label
                  htmlFor="application-decision-note"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Note
                </label>
                <textarea
                  id="application-decision-note"
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  disabled={isDecisionSubmitting}
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="Note interne de décision."
                />
              </div>

              <button
                type="submit"
                disabled={isDecisionSubmitting}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <SaveIcon />
                <span>
                  {isDecisionSubmitting
                    ? "Enregistrement..."
                    : "Enregistrer la décision"}
                </span>
              </button>
            </form>

            <div className="flex min-h-[150px] flex-1 flex-col justify-between rounded-[22px] border border-secondary/20 bg-secondary/10 p-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-secondaryDark">
                  Email
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Ouvrez la page dédiée pour rédiger le message de décision, choisir
                  le type d'email et enregistrer l'envoi dans l'historique du dossier.
                </p>
              </div>
              <Link
                to={`/applications/${application.id}/email`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white transition hover:bg-secondaryDark"
              >
                <MailIcon />
                <span>Accéder à l'envoi d'email</span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-6">
        <SectionCard
          title="Élèves"
          subtitle="Enfants rattachés à la demande et niveaux demandés."
          motionDelay={300}
        >
          {application.students.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
              Aucun élève n'est rattaché à cette demande.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {application.students.map((student) => (
                <article
                  key={student.id}
                  className="rounded-[28px] border border-slate-200/90 bg-slate-50/80 p-5 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.2)]"
                >
                  <div className="flex items-start gap-4">
                    <PersonAvatar
                      label={`${student.firstName} ${student.lastName}`}
                      size="md"
                      variant={getStudentAvatarVariant(student.gender)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-semibold text-slate-900">
                          {student.firstName} {student.lastName}
                        </h3>
                        {student.rankInForm ? (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                            Rang {student.rankInForm}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <LevelBadge
                          code={student.level.code}
                          label={student.level.label}
                          size="sm"
                        />
                        <span className="text-sm font-medium text-slate-600">
                          {student.level.label}
                        </span>
                        <StudentAdmissionBadge
                          status={getStudentAdmissionStatus(student)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <DetailField label="Genre">{genderLabels[student.gender]}</DetailField>
                    <DetailField label="Naissance">
                      {formatOptionalDate(student.birthDate)}
                    </DetailField>
                  </div>

                  <div className="mt-5 border-t border-slate-200/80 pt-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Décision individuelle
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {studentAdmissionStatusOptions.map((option) => {
                        const isCurrentStatus =
                          getStudentAdmissionStatus(student) === option.value;
                        const isSubmitting = updatingStudentAdmissionId === student.id;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              void handleStudentAdmissionStatusUpdate(
                                student.id,
                                option.value
                              )
                            }
                            disabled={isSubmitting || isCurrentStatus}
                            className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed ${
                              isCurrentStatus
                                ? "border-primary/20 bg-primary/10 text-primaryDark"
                                : "border-slate-300 bg-white text-slate-700 hover:border-primary/25 hover:text-primary disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            }`}
                          >
                            {isSubmitting && !isCurrentStatus
                              ? "Mise à jour..."
                              : option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          title="Historique du dossier"
          subtitle="Lecture chronologique des événements métier, décisions et emails."
          motionDelay={360}
        >
          <ol className="relative space-y-4 before:absolute before:bottom-3 before:left-[0.95rem] before:top-3 before:w-px before:bg-slate-200">
            {timelineEntries.map((entry) => (
              <li key={entry.id} className="relative pl-10">
                <span className="absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-primary text-white shadow-[0_10px_20px_-14px_rgba(31,77,58,0.7)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                <article className="rounded-[26px] border border-slate-200/90 bg-slate-50/80 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {entry.date}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {entry.type}
                      </h3>
                    </div>
                    {entry.badges ? <div className="shrink-0">{entry.badges}</div> : null}
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">
                    {entry.summary}
                  </p>
                  {entry.content ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {entry.content}
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    </>
  );
};

export default ApplicationDetailPage;
