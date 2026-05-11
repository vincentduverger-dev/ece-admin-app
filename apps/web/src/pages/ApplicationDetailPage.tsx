import {
  useCallback,
  useEffect,
  useMemo,
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
import StatusBadge from "../components/ui/StatusBadge";
import { useToast } from "../context/ToastContext";
import {
  fetchDashboardStats,
  getApplicationById,
  getApplicationEmailLogs,
  getSchoolYearLevelCapacities,
  updateStudentAdmissionStatus
} from "../lib/api";
import {
  applicationEmailSendStatusLabels,
  applicationEmailSendStatusStyles,
  applicationEmailTypeLabels,
  applicationEmailTypeStyles
} from "../lib/applicationEmail";
import type {
  ApplicationDetail,
  ApplicationDetailStudent,
  ApplicationEmailLog,
  ApplicationGender,
  ApplicationStatus,
  StudentAdmissionStatus
} from "../types/application";
import type { DashboardLevelStat } from "../types/dashboard";

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
  markerClassName: string;
  sortDate: number;
  summary: string;
  type: string;
};

const genderLabels: Record<ApplicationGender, string> = {
  BOY: "Garçon",
  GIRL: "Fille",
  UNKNOWN: "Non renseigné"
};

const studentAdmissionStatusOptions: Array<{
  value: StudentAdmissionStatus;
  label: string;
}> = [
  { value: "ACCEPTED", label: "Accepter" },
  { value: "WAITLISTED", label: "Liste d'attente" }
];

const studentAdmissionStatusLabels: Record<StudentAdmissionStatus, string> = {
  PENDING: "En attente",
  ACCEPTED: "Accepté",
  REFUSED: "Liste d'attente",
  WAITLISTED: "Liste d'attente"
};

const studentAdmissionStatusStyles: Record<StudentAdmissionStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
  ACCEPTED: "bg-success/15 text-success ring-success/20",
  REFUSED: "bg-info/15 text-info ring-info/20",
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
): boolean => {
  return (
    status === "ACCEPTED" ||
    status === "WAITLISTED" ||
    status === "REFUSED" ||
    status === "PARTIALLY_ACCEPTED"
  );
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

const getDecisionSummary = (status: ApplicationStatus): string => {
  if (status === "ACCEPTED") {
    return "Acceptation enregistrée";
  }

  if (status === "PARTIALLY_ACCEPTED") {
    return "Décision partielle enregistrée";
  }

  return "Liste d'attente enregistrée";
};

const getDecisionTimelineMarkerClassName = (status: ApplicationStatus): string => {
  if (status === "ACCEPTED") {
    return "bg-success shadow-[0_10px_20px_-14px_rgba(34,197,94,0.75)]";
  }

  if (status === "PARTIALLY_ACCEPTED") {
    return "bg-secondary shadow-[0_10px_20px_-14px_rgba(212,162,76,0.8)]";
  }

  return "bg-info shadow-[0_10px_20px_-14px_rgba(96,165,250,0.8)]";
};

const getEmailTimelineMarkerClassName = (
  emailLog: ApplicationEmailLog
): string => {
  if (emailLog.sendStatus === "FAILED") {
    return "bg-danger shadow-[0_10px_20px_-14px_rgba(239,68,68,0.75)]";
  }

  if (emailLog.emailType === "ACCEPTANCE") {
    return "bg-success shadow-[0_10px_20px_-14px_rgba(34,197,94,0.75)]";
  }

  if (emailLog.emailType === "PARTIAL_DECISION") {
    return "bg-secondary shadow-[0_10px_20px_-14px_rgba(212,162,76,0.8)]";
  }

  if (emailLog.emailType === "WAITLIST" || emailLog.emailType === "REFUSAL") {
    return "bg-info shadow-[0_10px_20px_-14px_rgba(96,165,250,0.8)]";
  }

  return "bg-slate-500 shadow-[0_10px_20px_-14px_rgba(100,116,139,0.75)]";
};

const getFinalDecisionStatus = (
  application: ApplicationDetail
): ApplicationStatus | null => {
  return application.decisionAt && isDecisionStatus(application.status)
    ? application.status
    : null;
};

const hasSentDecisionEmail = (emailLogs: ApplicationEmailLog[]): boolean => {
  return emailLogs.some((emailLog) => {
    return (
      emailLog.sendStatus === "SENT" &&
      emailLog.emailType !== "CUSTOM"
    );
  });
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

  const waitlistedCount = counts.WAITLISTED + counts.REFUSED;

  return `${counts.ACCEPTED} accepté${counts.ACCEPTED > 1 ? "s" : ""} · ${waitlistedCount} en liste d'attente · ${counts.PENDING} en attente`;
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

const MailSendAnimation = () => {
  return (
    <div
      aria-hidden="true"
      className="mail-send-animation mt-5 flex min-h-[180px] flex-1 items-center overflow-hidden rounded-[24px] border border-secondary/20 bg-white/65 px-4 py-4"
    >
      <svg viewBox="0 0 320 96" className="h-full min-h-[150px] w-full" fill="none">
        <path
          d="M34 58 C88 24 128 76 180 44 C222 18 252 42 286 28"
          className="mail-send-animation__trail"
          pathLength="1"
        />
        <g className="mail-send-animation__envelope">
          <rect x="26" y="36" width="62" height="42" rx="9" className="fill-white" />
          <rect
            x="26"
            y="36"
            width="62"
            height="42"
            rx="9"
            className="stroke-secondary/35"
            strokeWidth="2"
          />
          <path
            d="M31 44 57 62 83 44"
            className="stroke-primary"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g className="mail-send-animation__plane">
          <path
            d="M218 29 290 48 218 67 230 50 218 29Z"
            className="fill-secondary"
          />
          <path
            d="M230 50h31"
            className="stroke-white/85"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M218 29 248 51 218 67"
            className="stroke-secondaryDark/35"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
        <circle cx="126" cy="34" r="4" className="mail-send-animation__dot fill-primary" />
        <circle cx="151" cy="63" r="3.5" className="mail-send-animation__dot fill-secondary" />
        <circle cx="185" cy="34" r="3" className="mail-send-animation__dot fill-primary" />
      </svg>
    </div>
  );
};

const ParentAvatar = ({
  label,
  variant
}: {
  label: string;
  variant: "father" | "mother";
}) => {
  const isFather = variant === "father";
  const imageSource = isFather
    ? "/profil/Profil_Dad.png"
    : "/profil/Profil_mother.png";

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ${
        isFather
          ? "bg-primary/10 ring-primary/15"
          : "bg-secondary/15 ring-secondary/25"
      }`}
    >
      <img
        src={imageSource}
        alt=""
        className="h-[88%] w-[88%] object-contain object-bottom"
        draggable={false}
      />
    </span>
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
  variant: "man" | "woman";
}) => {
  const parentVariant = variant === "man" ? "father" : "mother";

  return (
    <article className="rounded-[26px] border border-slate-200/90 bg-slate-50/80 p-4">
      <div className="flex items-center gap-4">
        <ParentAvatar label={`${role} - ${name}`} variant={parentVariant} />
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
      type: "Demande importée",
      date: formatOptionalDateTime(application.createdAt),
      markerClassName: "bg-primary shadow-[0_10px_20px_-14px_rgba(31,77,58,0.75)]",
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
      markerClassName: getDecisionTimelineMarkerClassName(application.status),
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
      markerClassName: getEmailTimelineMarkerClassName(emailLog),
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
  const [levelCapacityByLevelId, setLevelCapacityByLevelId] = useState<
    Record<string, { isConfigured: boolean; availablePlaces: number }>
  >({});
  const [activeLevelStatsByLevelId, setActiveLevelStatsByLevelId] = useState<
    Record<string, DashboardLevelStat>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStudentAdmissionId, setUpdatingStudentAdmissionId] =
    useState<string | null>(null);
  const [isExceptionalEditEnabled, setIsExceptionalEditEnabled] = useState(false);
  const [isUnlockDecisionModalOpen, setIsUnlockDecisionModalOpen] =
    useState(false);
  const isDecisionLocked =
    Boolean(application?.decisionAt && isDecisionStatus(application.status)) ||
    hasSentDecisionEmail(emailLogs);
  const isTreatmentReadOnly = isDecisionLocked && !isExceptionalEditEnabled;

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
        const [capacities, dashboardStats] = await Promise.all([
          getSchoolYearLevelCapacities(applicationData.schoolYear.id, {
            signal: controller.signal
          }),
          applicationData.schoolYear.isActive
            ? fetchDashboardStats({ signal: controller.signal })
            : Promise.resolve(null)
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setApplication(applicationData);
        setEmailLogs(emailLogsData);
        setLevelCapacityByLevelId(
          Object.fromEntries(
            capacities.map((capacity) => [
              capacity.levelId,
              {
                isConfigured: capacity.id !== null,
                availablePlaces: capacity.availablePlaces
              }
            ])
          )
        );
        setActiveLevelStatsByLevelId(
          Object.fromEntries(
            (dashboardStats?.byLevel ?? [])
              .filter((level): level is DashboardLevelStat & { id: string } =>
                typeof level.id === "string"
              )
              .map((level) => [level.id, level])
          )
        );
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
    setIsExceptionalEditEnabled(false);
    setIsUnlockDecisionModalOpen(false);
  }, [application?.id, application?.decisionAt]);

  const handleStudentAdmissionStatusUpdate = useCallback(
    async (
      studentId: string,
      admissionStatus: StudentAdmissionStatus
    ): Promise<void> => {
      if (!application) {
        return;
      }

      if (isTreatmentReadOnly) {
        showError(
          "La décision est verrouillée depuis l'envoi de l'email au parent."
        );
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
        if (application.schoolYear.isActive) {
          const dashboardStats = await fetchDashboardStats();

          setActiveLevelStatsByLevelId(
            Object.fromEntries(
              dashboardStats.byLevel
                .filter((level): level is DashboardLevelStat & { id: string } =>
                  typeof level.id === "string"
                )
                .map((level) => [level.id, level])
            )
          );
        }
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
    [application, isTreatmentReadOnly, showError, showSuccess]
  );

  const handleOpenExceptionalEditModal = useCallback((): void => {
    setIsUnlockDecisionModalOpen(true);
  }, []);

  const handleCloseExceptionalEditModal = useCallback((): void => {
    setIsUnlockDecisionModalOpen(false);
  }, []);

  const handleConfirmExceptionalEdit = useCallback((): void => {
    setIsExceptionalEditEnabled(true);
    setIsUnlockDecisionModalOpen(false);
    showSuccess("Les modifications exceptionnelles sont maintenant activées.");
  }, [showSuccess]);

  const timelineEntries = useMemo(() => {
    return application ? buildTimelineEntries(application, emailLogs) : [];
  }, [application, emailLogs]);
  const familyLastNameTitle = useMemo(
    () => (application ? getFamilyLastNameTitle(application) : "Famille non renseignée"),
    [application]
  );
  const familyAvatarLabel =
    familyLastNameTitle === "Famille non renseignée"
      ? familyLastNameTitle
      : `Famille ${familyLastNameTitle}`;
  const applicationLevels = useMemo(
    () => (application ? getApplicationLevels(application) : []),
    [application]
  );
  const fatherName = useMemo(() => {
    return application
      ? formatParentName(
          application.family.fatherFirstName,
          application.family.fatherLastName
        )
      : "Non renseigné";
  }, [application]);
  const motherName = useMemo(() => {
    return application
      ? formatParentName(
          application.family.motherFirstName,
          application.family.motherLastName
        )
      : "Non renseigné";
  }, [application]);
  const studentAdmissionSummary = useMemo(() => {
    return application ? getStudentAdmissionSummary(application.students) : "";
  }, [application]);

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

  const treatmentAction = isDecisionLocked ? (
    <button
      type="button"
      onClick={handleOpenExceptionalEditModal}
      disabled={isExceptionalEditEnabled}
      className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition ${
        isExceptionalEditEnabled
          ? "cursor-default border-success/20 bg-success/10 text-success"
          : "border-danger/20 bg-danger/5 text-danger hover:border-danger/30 hover:bg-danger/10"
      }`}
    >
      {isExceptionalEditEnabled
        ? "Modification activée"
        : "Modifier exceptionnellement"}
    </button>
  ) : null;

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
              <DetailField label="Décision finale">
                {getFinalDecisionStatus(application) ? (
                  <StatusBadge status={getFinalDecisionStatus(application) as ApplicationStatus} />
                ) : (
                  "Non renseigné"
                )}
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
            subtitle="Statut global, décisions élèves et email."
            action={treatmentAction}
            bodyClassName="!mt-4 flex flex-1 flex-col gap-3 xl:min-h-0"
            className="!p-5 sm:!p-6 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
            motionDelay={220}
          >
            {isDecisionLocked ? (
              <div
                className={`rounded-[20px] border px-4 py-3 text-xs font-medium leading-5 ${
                  isExceptionalEditEnabled
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {isExceptionalEditEnabled
                  ? "Mode exceptionnel activé : les contrôles peuvent être modifiés."
                  : "Décision verrouillée : l'email de décision a déjà été envoyé au parent."}
              </div>
            ) : null}
            <div className="shrink-0 rounded-[22px] border border-slate-200/90 bg-slate-50/80 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Statut actuel
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <StatusBadge status={application.status} />
                <span className="text-xs font-medium leading-5 text-slate-500">
                  Mis à jour automatiquement depuis les décisions élèves.
                </span>
              </div>
            </div>

            <div
              className={`shrink-0 rounded-[22px] border border-slate-200/90 bg-slate-50/80 p-4 transition ${
                isTreatmentReadOnly ? "opacity-55 saturate-50" : ""
              }`}
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Décision des élèves
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                {studentAdmissionSummary}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-600">
                  Statut global :
                </span>
                <StatusBadge status={application.status} />
              </div>
            </div>

            <div
              className={`flex min-h-[360px] flex-1 flex-col rounded-[22px] border border-secondary/20 bg-secondary/10 p-4 transition xl:mb-0 ${
                isTreatmentReadOnly ? "opacity-55 saturate-50" : ""
              }`}
            >
              <div className="flex flex-1 flex-col">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-secondaryDark">
                  Email
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Ouvrez la page dédiée pour rédiger le message de décision, choisir
                  le type d'email et enregistrer l'envoi dans l'historique du dossier.
                </p>
                <MailSendAnimation />
              </div>
              {isTreatmentReadOnly ? (
                <span
                  aria-disabled="true"
                  className="mt-4 inline-flex w-full shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-slate-300 px-5 py-2 text-sm font-semibold text-white"
                >
                  <MailIcon />
                  <span>Envoi d'email verrouillé</span>
                </span>
              ) : (
                <Link
                  to={`/applications/${application.id}/email`}
                  className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white transition hover:bg-secondaryDark"
                >
                  <MailIcon />
                  <span>Accéder à l'envoi d'email</span>
                </Link>
              )}
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
            <div className="grid gap-4">
              {application.students.map((student) => (
                <article
                  key={student.id}
                  className="rounded-[28px] border border-slate-200/90 bg-slate-50/80 p-5 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.2)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
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
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <LevelBadge
                            code={student.level.code}
                            label={student.level.label}
                            size="sm"
                          />
                          <StudentAdmissionBadge
                            status={getStudentAdmissionStatus(student)}
                          />
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/students/${student.id}`}
                      className="inline-flex w-fit shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary"
                    >
                      Voir l'élève
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <DetailField label="Genre">{genderLabels[student.gender]}</DetailField>
                    <DetailField label="Naissance">
                      {formatOptionalDate(student.birthDate)}
                    </DetailField>
                  </div>

                  <div
                    className={`mt-5 border-t border-slate-200/80 pt-4 transition ${
                      isTreatmentReadOnly ? "opacity-55 saturate-50" : ""
                    }`}
                  >
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Décision individuelle
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {studentAdmissionStatusOptions.map((option) => {
                        const isCurrentStatus =
                          getStudentAdmissionStatus(student) === option.value;
                        const isSubmitting = updatingStudentAdmissionId === student.id;
                        const levelId = student.level.id;
                        const levelCapacity = levelId
                          ? levelCapacityByLevelId[levelId]
                          : undefined;
                        const activeLevelStats = levelId
                          ? activeLevelStatsByLevelId[levelId]
                          : undefined;
                        const isCapacityMissing =
                          option.value === "ACCEPTED" &&
                          getStudentAdmissionStatus(student) !== "ACCEPTED" &&
                          levelCapacity?.isConfigured === false;
                        const isLevelFull =
                          option.value === "ACCEPTED" &&
                          getStudentAdmissionStatus(student) !== "ACCEPTED" &&
                          application.schoolYear.isActive &&
                          typeof activeLevelStats?.remainingPlaces === "number" &&
                          activeLevelStats.remainingPlaces <= 0;
                        const acceptBlockMessage = isCapacityMissing
                          ? "Places disponibles non renseignées pour ce niveau."
                          : isLevelFull
                          ? "Ce niveau est complet. Aucune place restante."
                          : null;
                        const activeButtonClassName =
                          option.value === "ACCEPTED"
                            ? "border-success/20 bg-success/15 text-success"
                            : "border-info/20 bg-info/15 text-info";
                        const interactiveButtonClassName =
                          option.value === "ACCEPTED"
                            ? "border-slate-300 bg-white text-slate-700 hover:border-success/25 hover:bg-success/10 hover:text-success"
                            : "border-slate-300 bg-white text-slate-700 hover:border-info/25 hover:bg-info/10 hover:text-info";
                        const readOnlyButtonClassName =
                          "border-slate-200 bg-slate-100 text-slate-400";

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
                            disabled={
                              isTreatmentReadOnly ||
                              isSubmitting ||
                              isCurrentStatus ||
                              Boolean(acceptBlockMessage)
                            }
                            className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed ${
                              isTreatmentReadOnly
                                ? readOnlyButtonClassName
                                : isCurrentStatus
                                ? activeButtonClassName
                                : `${interactiveButtonClassName} disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`
                            }`}
                          >
                            {isSubmitting && !isCurrentStatus
                              ? "Mise à jour..."
                              : option.label}
                          </button>
                        );
                      })}
                    </div>
                    {(() => {
                      const levelId = student.level.id;
                      const levelCapacity = levelId
                        ? levelCapacityByLevelId[levelId]
                        : undefined;
                      const activeLevelStats = levelId
                        ? activeLevelStatsByLevelId[levelId]
                        : undefined;
                      const isAccepted = getStudentAdmissionStatus(student) === "ACCEPTED";
                      const message =
                        !isAccepted && levelCapacity?.isConfigured === false
                          ? "Places disponibles non renseignées pour ce niveau."
                          : !isAccepted &&
                            application.schoolYear.isActive &&
                            typeof activeLevelStats?.remainingPlaces === "number" &&
                            activeLevelStats.remainingPlaces <= 0
                          ? "Ce niveau est complet. Aucune place restante."
                          : null;

                      return message ? (
                        <p className="mt-3 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold text-slate-700">
                          {message}
                        </p>
                      ) : null;
                    })()}
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
                <span
                  className={`absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-white text-white ${entry.markerClassName}`}
                >
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

      {isUnlockDecisionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-decision-title"
            className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.45)]"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondaryDark">
              Modification exceptionnelle
            </p>
            <h2
              id="unlock-decision-title"
              className="mt-2 text-2xl font-semibold text-slate-900"
            >
              Autoriser la modification après envoi ?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              L'email de décision a déjà été envoyé au parent. Cette action
              réactive temporairement les contrôles de traitement et les décisions
              individuelles pour corriger le dossier.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseExceptionalEditModal}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmExceptionalEdit}
                className="inline-flex items-center justify-center rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secondaryDark"
              >
                Autoriser la modification
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ApplicationDetailPage;
