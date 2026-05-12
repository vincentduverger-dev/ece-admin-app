import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type ReactNode
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { EmailSentAnimation } from "../components/animations";
import FeedbackEmptyState from "../components/feedback/EmptyState";
import SuccessFeedback from "../components/feedback/SuccessFeedback";
import PageSectionHeader from "../components/layout/PageSectionHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import ErrorState from "../components/ui/ErrorState";
import LevelBadge from "../components/ui/LevelBadge";
import LoadingState from "../components/ui/LoadingState";
import PersonAvatar, {
  type PersonAvatarVariant
} from "../components/ui/PersonAvatar";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { useToast } from "../context/ToastContext";
import {
  getApplicationById,
  getApplicationEmailLogs,
  sendApplicationEmail,
  updateApplicationContactEmail
} from "../lib/api";
import {
  applicationEmailSendStatusLabels,
  applicationEmailSendStatusStyles,
  applicationEmailTemplates,
  applicationEmailTypeLabels,
  applicationEmailTypeOptions,
  applicationEmailTypeStyles,
  getApplicationEmailActionErrorMessage,
  getApplicationDecisionChangeEmailTemplate,
  getApplicationDecisionEmailContext,
  getApplicationDecisionEmailTemplate,
  getLatestSentDecisionEmailLog
} from "../lib/applicationEmail";
import type {
  ApplicationDetail,
  ApplicationEmailLog,
  ApplicationEmailSendPayload,
  ApplicationEmailType,
  ApplicationGender,
  StudentAdmissionStatus
} from "../types/application";

type IconProps = {
  className?: string;
};

type DetailFieldProps = {
  children: ReactNode;
  label: string;
};

type SectionCardProps = {
  children: ReactNode;
  className?: string;
  motionDelay?: number;
  subtitle?: string;
  title: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
});
const maxAttachmentTotalSize = 10 * 1024 * 1024;
const maxAttachmentCount = 8;
const dangerousAttachmentExtensions = new Set([
  ".app",
  ".bat",
  ".cmd",
  ".com",
  ".cpl",
  ".dll",
  ".dmg",
  ".exe",
  ".gadget",
  ".hta",
  ".jar",
  ".js",
  ".jse",
  ".lnk",
  ".msi",
  ".msp",
  ".pif",
  ".ps1",
  ".scr",
  ".sh",
  ".vbs",
  ".vbe",
  ".wsf"
]);
const dangerousAttachmentMimeTypes = new Set([
  "application/javascript",
  "application/java-archive",
  "application/vnd.microsoft.portable-executable",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-msi",
  "application/x-sh",
  "text/javascript"
]);

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

const getEnterStyle = (delay: number): CSSProperties => {
  return {
    "--ui-enter-delay": `${delay}ms`
  } as CSSProperties;
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
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

const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} o`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} Ko`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
};

const getAttachmentExtension = (filename: string): string => {
  const extensionStartIndex = filename.lastIndexOf(".");

  return extensionStartIndex >= 0
    ? filename.slice(extensionStartIndex).toLowerCase()
    : "";
};

const getAttachmentKindLabel = (file: File): string => {
  if (file.type.startsWith("image/")) {
    return "Image";
  }

  if (file.type === "application/pdf") {
    return "PDF";
  }

  const extension = getAttachmentExtension(file.name);

  return extension ? extension.slice(1).toUpperCase() : "Fichier";
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
    return "Chargement de l'envoi";
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

  return "Famille non renseignée";
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

const getStudentAdmissionStatus = (
  student: ApplicationDetail["students"][number]
): StudentAdmissionStatus => {
  return student.admissionStatus ?? "PENDING";
};

const getRequiresSendConfirmation = (
  selectedEmailType: ApplicationEmailType,
  recommendedEmailType: ApplicationEmailType
): boolean => {
  return selectedEmailType === "CUSTOM" || selectedEmailType !== recommendedEmailType;
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

const SendIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
      className={className}
    >
      <path d="M13.5 2.8 6.9 9.4" />
      <path d="m13.5 2.8-3.2 10.4-3.4-3.8-4.1-1.8 10.7-4.8Z" />
    </svg>
  );
};

const EditIcon = ({ className = "h-4 w-4" }: IconProps) => {
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
      <path d="M9.75 3.25 12.75 6.25" />
      <path d="M3.5 10.5 10.75 3.25a2.12 2.12 0 0 1 3 3L6.5 13.5H3.25l.25-3Z" />
    </svg>
  );
};

const AttachmentIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
      className={className}
    >
      <path d="M6.4 8.55 9.95 5a2.2 2.2 0 0 1 3.1 3.1l-4.6 4.6a3.2 3.2 0 0 1-4.53-4.52l4.7-4.7a1.45 1.45 0 0 1 2.05 2.05L6.15 10.05" />
    </svg>
  );
};

const FileIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
      className={className}
    >
      <path d="M4 1.75h5.1L12.5 5.2v9.05H4z" />
      <path d="M9 1.9V5.3h3.35" />
      <path d="M5.9 8.35h4.2" />
      <path d="M5.9 10.75h3.2" />
    </svg>
  );
};

const RemoveIcon = ({ className = "h-4 w-4" }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      className={className}
    >
      <path d="M4 4l8 8" />
      <path d="M12 4l-8 8" />
    </svg>
  );
};

const DetailField = ({ label, children }: DetailFieldProps) => {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-4 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.18)]">
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
  children,
  className,
  motionDelay = 0
}: SectionCardProps) => {
  return (
    <section
      className={`ui-animate-in ui-surface-hover ui-surface-hover--soft ui-surface-hover--no-accent flex flex-col rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)] backdrop-blur sm:p-7${
        className ? ` ${className}` : ""
      }`}
      style={getEnterStyle(motionDelay)}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primaryLight">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex-1">{children}</div>
    </section>
  );
};

const ApplicationEmailPage = () => {
  const { id: applicationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [emailLogs, setEmailLogs] = useState<ApplicationEmailLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmailType, setSelectedEmailType] =
    useState<ApplicationEmailType>("ACCEPTANCE");
  const [emailSubject, setEmailSubject] = useState(
    applicationEmailTemplates.ACCEPTANCE.subject
  );
  const [emailBody, setEmailBody] = useState(
    applicationEmailTemplates.ACCEPTANCE.body
  );
  const [isEmailSubjectDirty, setIsEmailSubjectDirty] = useState(false);
  const [isEmailBodyDirty, setIsEmailBodyDirty] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isSendConfirmationOpen, setIsSendConfirmationOpen] = useState(false);
  const [hasEmailSendSuccess, setHasEmailSendSuccess] = useState(false);
  const [isContactEmailModalOpen, setIsContactEmailModalOpen] = useState(false);
  const [contactEmailDraft, setContactEmailDraft] = useState("");
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const [isUpdatingContactEmail, setIsUpdatingContactEmail] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isAttachmentDragActive, setIsAttachmentDragActive] = useState(false);

  const resetEmailForm = useCallback((
    nextApplication?: ApplicationDetail,
    nextEmailLogs: ApplicationEmailLog[] = []
  ): void => {
    if (!nextApplication) {
      setSelectedEmailType("ACCEPTANCE");
      setEmailSubject(applicationEmailTemplates.ACCEPTANCE.subject);
      setEmailBody(applicationEmailTemplates.ACCEPTANCE.body);
      setIsEmailSubjectDirty(false);
      setIsEmailBodyDirty(false);
      return;
    }

    const latestSentDecisionEmailLog =
      getLatestSentDecisionEmailLog(nextEmailLogs);

    if (latestSentDecisionEmailLog) {
      const decisionChangeTemplate = getApplicationDecisionChangeEmailTemplate(
        nextApplication,
        latestSentDecisionEmailLog
      );

      setSelectedEmailType("CUSTOM");
      setEmailSubject(decisionChangeTemplate.subject);
      setEmailBody(decisionChangeTemplate.body);
      setIsEmailSubjectDirty(false);
      setIsEmailBodyDirty(false);
      return;
    }

    const decisionEmailContext = getApplicationDecisionEmailContext(nextApplication);
    const template = getApplicationDecisionEmailTemplate(
      nextApplication,
      decisionEmailContext.recommendedEmailType
    );

    setSelectedEmailType(decisionEmailContext.recommendedEmailType);
    setEmailSubject(template?.subject ?? "");
    setEmailBody(template?.body ?? "");
    setIsEmailSubjectDirty(false);
    setIsEmailBodyDirty(false);
  }, []);

  const handleEmailTypeChange = useCallback((emailType: ApplicationEmailType): void => {
    setSelectedEmailType(emailType);

    if (emailType === "CUSTOM") {
      setEmailSubject("");
      setEmailBody("");
      setIsEmailSubjectDirty(false);
      setIsEmailBodyDirty(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadApplicationEmailContext = async (): Promise<void> => {
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
        resetEmailForm(applicationData, emailLogsData);
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

    void loadApplicationEmailContext();

    return () => {
      controller.abort();
    };
  }, [applicationId, resetEmailForm]);

  useEffect(() => {
    if (!application) {
      return;
    }

    const latestSentDecisionEmailLog = getLatestSentDecisionEmailLog(emailLogs);
    const template = latestSentDecisionEmailLog && selectedEmailType === "CUSTOM"
      ? getApplicationDecisionChangeEmailTemplate(
          application,
          latestSentDecisionEmailLog
        )
      : getApplicationDecisionEmailTemplate(application, selectedEmailType);

    if (!template) {
      return;
    }

    if (!isEmailSubjectDirty) {
      setEmailSubject(template.subject);
    }

    if (!isEmailBodyDirty) {
      setEmailBody(template.body);
    }
  }, [
    application,
    emailLogs,
    selectedEmailType,
    isEmailSubjectDirty,
    isEmailBodyDirty
  ]);

  const getValidatedEmailPayload =
    useCallback((): ApplicationEmailSendPayload | null => {
      if (!application) {
        return null;
      }

      const normalizedSubject = emailSubject.trim();
      const normalizedBody = emailBody.trim();

      if (normalizedSubject.length === 0) {
        showError("Le sujet est obligatoire.");
        return null;
      }

      if (normalizedBody.length === 0) {
        showError("Le message est obligatoire.");
        return null;
      }

      const shouldSyncDecisionAt =
        selectedEmailType === "CUSTOM" &&
        Boolean(getLatestSentDecisionEmailLog(emailLogs));

      return {
        attachments: selectedAttachments,
        emailType: selectedEmailType,
        subject: normalizedSubject,
        body: normalizedBody,
        syncDecisionAt: shouldSyncDecisionAt
      };
    }, [
      application,
      emailBody,
      emailLogs,
      emailSubject,
      selectedAttachments,
      selectedEmailType,
      showError
    ]);

  const sendValidatedEmail = useCallback(
    async (payload: ApplicationEmailSendPayload): Promise<void> => {
      if (!application) {
        return;
      }

      setIsEmailSubmitting(true);
      setHasEmailSendSuccess(false);

      try {
        const createdEmailLog = await sendApplicationEmail(application.id, payload);
        const refreshedEmailLogs = await getApplicationEmailLogs(application.id);

        setEmailLogs(
          refreshedEmailLogs.some((emailLog) => emailLog.id === createdEmailLog.id)
            ? refreshedEmailLogs
            : [createdEmailLog, ...refreshedEmailLogs]
        );
        resetEmailForm(application, refreshedEmailLogs);
        setIsSendConfirmationOpen(false);
        setHasEmailSendSuccess(true);
        setSelectedAttachments([]);
        setAttachmentError(null);
        showSuccess("L'email a été envoyé et enregistré dans l'historique.");
        navigate(`/applications/${application.id}`, { replace: true });
      } catch (sendError) {
        showError(getApplicationEmailActionErrorMessage(sendError));
      } finally {
        setIsEmailSubmitting(false);
      }
    },
    [application, navigate, resetEmailForm, showError, showSuccess]
  );

  const handleEmailSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (!application) {
        return;
      }

      const payload = getValidatedEmailPayload();

      if (!payload) {
        return;
      }

      setIsSendConfirmationOpen(true);
    },
    [
      application,
      getValidatedEmailPayload,
    ]
  );

  const handleConfirmSend = useCallback(async (): Promise<void> => {
    const payload = getValidatedEmailPayload();

    if (!payload) {
      return;
    }

    await sendValidatedEmail(payload);
  }, [getValidatedEmailPayload, sendValidatedEmail]);

  const handleCancelSendConfirmation = useCallback((): void => {
    if (!isEmailSubmitting) {
      setIsSendConfirmationOpen(false);
    }
  }, [isEmailSubmitting]);

  const handleEmailSubjectChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setEmailSubject(event.target.value);
      setIsEmailSubjectDirty(true);
    },
    []
  );

  const handleEmailBodyChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setEmailBody(event.target.value);
      setIsEmailBodyDirty(true);
    },
    []
  );

  const addAttachments = useCallback((files: File[]): void => {
    if (files.length === 0) {
      return;
    }

    setSelectedAttachments((currentAttachments) => {
      const attachmentBySignature = new Map(
        currentAttachments.map((file) => [
          `${file.name}-${file.size}-${file.lastModified}`,
          file
        ])
      );

      for (const file of files) {
        const extension = getAttachmentExtension(file.name);
        const mimeType = file.type.toLowerCase();

        if (
          dangerousAttachmentExtensions.has(extension) ||
          dangerousAttachmentMimeTypes.has(mimeType)
        ) {
          setAttachmentError(`Le fichier ${file.name} n'est pas autorisé.`);
          return currentAttachments;
        }

        attachmentBySignature.set(
          `${file.name}-${file.size}-${file.lastModified}`,
          file
        );
      }

      const nextAttachments = Array.from(attachmentBySignature.values());

      if (nextAttachments.length > maxAttachmentCount) {
        setAttachmentError(
          `Vous pouvez ajouter ${maxAttachmentCount} pièces jointes au maximum.`
        );
        return currentAttachments;
      }

      const totalSize = nextAttachments.reduce((sum, file) => sum + file.size, 0);

      if (totalSize > maxAttachmentTotalSize) {
        setAttachmentError("La taille totale des pièces jointes ne doit pas dépasser 10 Mo.");
        return currentAttachments;
      }

      setAttachmentError(null);
      return nextAttachments;
    });
  }, []);

  const handleAttachmentInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      addAttachments(Array.from(event.target.files ?? []));
      event.target.value = "";
    },
    [addAttachments]
  );

  const handleAttachmentDrop = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setIsAttachmentDragActive(false);

      if (isEmailSubmitting) {
        return;
      }

      addAttachments(Array.from(event.dataTransfer.files));
    },
    [addAttachments, isEmailSubmitting]
  );

  const handleRemoveAttachment = useCallback((attachmentIndex: number): void => {
    setSelectedAttachments((currentAttachments) =>
      currentAttachments.filter((_, index) => index !== attachmentIndex)
    );
    setAttachmentError(null);
  }, []);

  useEffect(() => {
    setIsSendConfirmationOpen(false);
  }, [selectedEmailType, emailSubject, emailBody]);

  useEffect(() => {
    setIsContactEmailModalOpen(false);
    setContactEmailDraft("");
    setContactEmailError(null);
    setSelectedAttachments([]);
    setAttachmentError(null);
    setIsAttachmentDragActive(false);
  }, [application?.id]);

  const handleOpenContactEmailModal = useCallback((): void => {
    setContactEmailDraft(application?.family.contactEmail ?? "");
    setContactEmailError(null);
    setIsContactEmailModalOpen(true);
  }, [application?.family.contactEmail]);

  const handleCloseContactEmailModal = useCallback((): void => {
    if (isUpdatingContactEmail) {
      return;
    }

    setIsContactEmailModalOpen(false);
    setContactEmailError(null);
  }, [isUpdatingContactEmail]);

  const handleSubmitContactEmailUpdate = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (!application) {
        return;
      }

      const normalizedEmail = contactEmailDraft.trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setContactEmailError("Veuillez saisir une adresse email valide.");
        return;
      }

      setIsUpdatingContactEmail(true);
      setContactEmailError(null);

      try {
        const updateResult = await updateApplicationContactEmail(
          application.id,
          normalizedEmail
        );

        setApplication((currentApplication) =>
          currentApplication
            ? {
                ...currentApplication,
                family: {
                  ...currentApplication.family,
                  ...updateResult.family
                }
              }
            : currentApplication
        );
        setIsContactEmailModalOpen(false);
        showSuccess("L'email de contact a bien été corrigé.");
      } catch (updateError) {
        setContactEmailError(
          getActionErrorMessage(
            "Impossible de corriger l'email de contact.",
            updateError
          )
        );
      } finally {
        setIsUpdatingContactEmail(false);
      }
    },
    [application, contactEmailDraft, showSuccess]
  );

  const detailPath = applicationId ? `/applications/${applicationId}` : "/applications";
  const decisionEmailContext = useMemo(() => {
    return application ? getApplicationDecisionEmailContext(application) : null;
  }, [application]);
  const latestSentDecisionEmailLog = useMemo(() => {
    return getLatestSentDecisionEmailLog(emailLogs);
  }, [emailLogs]);
  const decisionChangeTemplate = useMemo(() => {
    if (!application || !latestSentDecisionEmailLog) {
      return null;
    }

    return getApplicationDecisionChangeEmailTemplate(
      application,
      latestSentDecisionEmailLog
    );
  }, [application, latestSentDecisionEmailLog]);
  const recommendedEmailType =
    latestSentDecisionEmailLog
      ? "CUSTOM"
      : decisionEmailContext?.recommendedEmailType ?? selectedEmailType;
  const applicationFamilyTitle = useMemo(
    () => getApplicationFamilyTitle(application),
    [application]
  );
  const isCustomEmail = selectedEmailType === "CUSTOM";
  const isDecisionChangeEmail = Boolean(
    latestSentDecisionEmailLog && selectedEmailType === "CUSTOM"
  );
  const isEmailTypeMismatch = selectedEmailType !== recommendedEmailType;
  const requiresSendConfirmation = getRequiresSendConfirmation(
    selectedEmailType,
    recommendedEmailType
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
            { label: "Détail", href: detailPath },
            { label: "Envoi email" }
          ]}
        />
      </div>

      <Link
        to={detailPath}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary"
      >
        <BackIcon />
        <span>Retour au détail</span>
      </Link>
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
          eyebrow="Email de décision"
          title="Préparer l'email"
          description="Page dédiée à la rédaction et à l'envoi d'un email lié à une demande."
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
          eyebrow="Email de décision"
          title="Préparer l'email"
          description="Page dédiée à la rédaction et à l'envoi d'un email lié à une demande."
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

  if (!decisionEmailContext) {
    return null;
  }

  return (
    <>
      <div className="ui-animate-in ui-animate-in--subtle" style={getEnterStyle(120)}>
        <PageSectionHeader
          topBar={pageTopBar}
          eyebrow="Email de décision"
          title="Envoyer un email à la famille"
          description={`${applicationFamilyTitle} · destinataire ${formatOptionalText(application.family.contactEmail)}.`}
          aside={pageHeaderAside}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.62fr)] xl:items-stretch">
        <SectionCard
          title="Rédaction"
          subtitle="Composer le message avant envoi et historisation sur le dossier."
          className="h-full"
          motionDelay={180}
        >
          <form className="flex h-full flex-col gap-5" onSubmit={handleEmailSubmit}>
            <div className="rounded-[26px] border border-slate-200/90 bg-slate-50/80 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Destinataire
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="min-w-0 break-all text-sm font-semibold text-slate-900">
                  {formatOptionalText(application.family.contactEmail)}
                </p>
                <button
                  type="button"
                  onClick={handleOpenContactEmailModal}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary transition hover:border-secondary/40 hover:bg-secondary/10 hover:text-secondaryDark"
                  aria-label="Modifier l'email de contact"
                  title="Modifier l'email de contact"
                  disabled={isEmailSubmitting}
                >
                  <EditIcon />
                </button>
              </div>
            </div>

            <div
              className={`rounded-[26px] border border-dashed p-4 transition ${
                isAttachmentDragActive
                  ? "border-secondary/60 bg-secondary/10"
                  : "border-slate-200 bg-white/80"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!isEmailSubmitting) {
                  setIsAttachmentDragActive(true);
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsAttachmentDragActive(false);
                }
              }}
              onDrop={handleAttachmentDrop}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Pièces jointes
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Déposez les fichiers ici ou ajoutez-les depuis votre ordinateur.
                  </p>
                </div>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentInputChange}
                  disabled={isEmailSubmitting}
                />
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={isEmailSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-secondary/40 hover:bg-secondary/10 hover:text-secondaryDark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AttachmentIcon />
                  <span>Ajouter une pièce jointe</span>
                </button>
              </div>

              {selectedAttachments.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {selectedAttachments.map((attachment, attachmentIndex) => (
                    <div
                      key={`${attachment.name}-${attachment.size}-${attachment.lastModified}-${attachmentIndex}`}
                      className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary ring-1 ring-slate-200">
                        <FileIcon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {attachment.name}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          {getAttachmentKindLabel(attachment)} · {formatFileSize(attachment.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(attachmentIndex)}
                        disabled={isEmailSubmitting}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Retirer ${attachment.name}`}
                        title="Retirer la pièce jointe"
                      >
                        <RemoveIcon />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs font-medium text-slate-500">
                    Total :{" "}
                    {formatFileSize(
                      selectedAttachments.reduce((sum, file) => sum + file.size, 0)
                    )}{" "}
                    / 10 Mo
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs font-medium text-slate-500">
                  Aucun fichier sélectionné. Maximum 10 Mo au total.
                </p>
              )}

              {attachmentError ? (
                <p className="mt-3 rounded-[18px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                  {attachmentError}
                </p>
              ) : null}
            </div>

            {decisionEmailContext.warnings.length > 0 ? (
              <div className="space-y-3">
                {decisionEmailContext.warnings.map((warning) => (
                  <div
                    key={warning.message}
                    className={`rounded-[22px] border px-4 py-3 text-sm font-medium leading-6 ${
                      warning.tone === "warning"
                        ? "border-warning/25 bg-warning/10 text-slate-800"
                        : "border-info/25 bg-info/10 text-slate-800"
                    }`}
                  >
                    {warning.message}
                  </div>
                ))}
              </div>
            ) : null}

            {isDecisionChangeEmail ? (
              <div className="rounded-[22px] border border-info/25 bg-info/10 px-4 py-3 text-sm leading-6 text-slate-800">
                <p className="font-semibold text-slate-900">
                  Email de mise à jour préparé automatiquement.
                </p>
                <p className="mt-1">
                  Un premier email de décision a déjà été envoyé. Le message
                  explique le changement et reprend le récapitulatif actuel du
                  dossier pour éviter toute confusion.
                </p>
                {decisionChangeTemplate ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-info">
                    {decisionChangeTemplate.changedStudentsCount > 0
                      ? `${decisionChangeTemplate.changedStudentsCount} changement${
                          decisionChangeTemplate.changedStudentsCount > 1
                            ? "s"
                            : ""
                        } détecté${
                          decisionChangeTemplate.changedStudentsCount > 1
                            ? "s"
                            : ""
                        }`
                      : "Récapitulatif complet généré"}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Type d'email
                </span>
                <select
                  value={selectedEmailType}
                  onChange={(event) => {
                    handleEmailTypeChange(event.target.value as ApplicationEmailType);
                  }}
                  disabled={isEmailSubmitting}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {applicationEmailTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs font-medium text-slate-500">
                  Recommandé :{" "}
                  {isDecisionChangeEmail
                    ? "Email de mise à jour"
                    : applicationEmailTypeLabels[
                        decisionEmailContext.recommendedEmailType
                      ]}
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Sujet
                </span>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={handleEmailSubjectChange}
                  disabled={isEmailSubmitting}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder={
                    selectedEmailType === "CUSTOM"
                      ? "Saisir un sujet personnalisé"
                      : "ECE - décision d'admission"
                  }
                />
              </label>
            </div>

            {isCustomEmail && !isDecisionChangeEmail ? (
              <div className="rounded-[22px] border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm leading-6 text-slate-800">
                <p className="font-semibold text-slate-900">
                  Vous envoyez un email personnalisé.
                </p>
                <p className="mt-1">
                  Vérifiez attentivement le contenu avant l'envoi. Une confirmation
                  sera demandée avant l'envoi.
                </p>
              </div>
            ) : isEmailTypeMismatch ? (
              <div className="rounded-[22px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm leading-6 text-slate-800">
                <p className="font-semibold text-slate-900">
                  Attention : le type d'email sélectionné ne correspond pas à
                  l'état actuel de la demande.
                </p>
                <div className="mt-2 space-y-1">
                  <p>
                    Type recommandé :{" "}
                    <span className="font-semibold">
                      {applicationEmailTypeLabels[recommendedEmailType]}
                    </span>
                  </p>
                  <p>
                    Type sélectionné :{" "}
                    <span className="font-semibold">
                      {applicationEmailTypeLabels[selectedEmailType]}
                    </span>
                  </p>
                </div>
                <p className="mt-2">
                  Vérifiez le contenu du message avant de continuer. Une
                  confirmation sera demandée avant l'envoi.
                </p>
              </div>
            ) : null}

            <label className="flex flex-1 flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Message
              </span>
              <textarea
                value={emailBody}
                onChange={handleEmailBodyChange}
                disabled={isEmailSubmitting}
                rows={10}
                className="mt-2 min-h-[320px] flex-1 resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder={
                  selectedEmailType === "CUSTOM"
                    ? "Saisir votre message personnalisé."
                    : "Votre demande a été acceptée."
                }
              />
            </label>

            <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to={detailPath}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary"
              >
                <BackIcon />
                <span>Revenir au dossier</span>
              </Link>
              <button
                type="submit"
                disabled={isEmailSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <SendIcon />
                <span>{isEmailSubmitting ? "Envoi en cours..." : "Envoyer l'email"}</span>
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Dossier"
          subtitle="Contexte de la demande pendant la rédaction."
          className="h-full"
          motionDelay={240}
        >
          <div className="space-y-4">
            <DetailField label="Famille">
              {applicationFamilyTitle}
            </DetailField>
            <DetailField label="Année scolaire">
              {formatSchoolYearLabel(application.schoolYear.label)}
            </DetailField>
            <DetailField label="Statut">
              <StatusBadge status={application.status} />
            </DetailField>
            <DetailField label="Contact">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-all">
                  {formatOptionalText(application.family.contactEmail)}
                </span>
                <button
                  type="button"
                  onClick={handleOpenContactEmailModal}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/5 text-primary transition hover:border-secondary/40 hover:bg-secondary/10 hover:text-secondaryDark"
                  aria-label="Modifier l'email de contact"
                  title="Modifier l'email de contact"
                  disabled={isEmailSubmitting}
                >
                  <EditIcon />
                </button>
              </div>
            </DetailField>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Élèves
            </p>
            {application.students.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-5 text-sm text-slate-500">
                Aucun élève rattaché.
              </p>
            ) : (
              application.students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-[24px] border border-slate-200/90 bg-slate-50/80 p-3"
                >
                  <PersonAvatar
                    label={`${student.firstName} ${student.lastName}`}
                    size="sm"
                    variant={getStudentAvatarVariant(student.gender)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-900">
                      {student.firstName} {student.lastName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <LevelBadge
                        code={student.level.code}
                        label={student.level.label}
                        size="xs"
                      />
                      <span className="text-xs font-medium text-slate-500">
                        {student.level.label}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] ring-1 ${studentAdmissionStatusStyles[getStudentAdmissionStatus(student)]}`}
                      >
                        {studentAdmissionStatusLabels[getStudentAdmissionStatus(student)]}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Historique des emails"
          subtitle="Emails enregistrés pour cette demande."
          className="xl:col-span-2"
          motionDelay={300}
        >
          {emailLogs.length === 0 ? (
            <FeedbackEmptyState
              title="Aucun email enregistré"
              description="Les emails envoyés depuis cette page apparaîtront ici dès leur historisation."
            />
          ) : (
            <div className="space-y-3">
              {emailLogs.map((emailLog) => (
                <article
                  key={emailLog.id}
                  className="rounded-[24px] border border-slate-200/90 bg-slate-50/80 p-4"
                >
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
                  <h3 className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                    {emailLog.subject}
                  </h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    {formatOptionalDateTime(emailLog.sentAt ?? emailLog.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {hasEmailSendSuccess ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)] lg:items-center">
          <div className="mx-auto w-full max-w-[150px] lg:mx-0">
            <EmailSentAnimation className="h-auto" />
          </div>
          <SuccessFeedback
            title="Email envoyé"
            description="Le message est envoyé à la famille et enregistré dans l'historique de la demande."
          />
        </div>
      ) : null}

      {isSendConfirmationOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.45)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-send-confirmation-title"
          >
            <h2
              id="email-send-confirmation-title"
              className="text-xl font-semibold text-slate-900"
            >
              {isDecisionChangeEmail
                ? "Confirmer l'envoi de la mise à jour"
                : requiresSendConfirmation
                  ? "Confirmer l'envoi d'un email non recommandé"
                  : "Confirmer l'envoi de l'email"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isDecisionChangeEmail
                ? "Ce message informe la famille qu'une décision déjà communiquée a été modifiée. Vérifiez le récapitulatif avant l'envoi."
                : requiresSendConfirmation
                  ? isCustomEmail
                    ? "Vous envoyez un email personnalisé. Vérifiez attentivement le contenu avant l'envoi."
                    : "Le type d'email sélectionné ne correspond pas à la décision actuelle du dossier. Cet envoi peut transmettre une information incorrecte à la famille."
                  : "Cette action va envoyer l'email à la famille et l'enregistrer dans l'historique du dossier."}
            </p>

            {requiresSendConfirmation && !isDecisionChangeEmail ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <p>
                  Type recommandé :{" "}
                  <span className="font-semibold text-slate-900">
                    {applicationEmailTypeLabels[recommendedEmailType]}
                  </span>
                </p>
                <p>
                  Type sélectionné :{" "}
                  <span className="font-semibold text-slate-900">
                    {applicationEmailTypeLabels[selectedEmailType]}
                  </span>
                </p>
              </div>
            ) : null}

            {selectedAttachments.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <p className="font-semibold text-slate-900">
                  {selectedAttachments.length > 1
                    ? `${selectedAttachments.length} pièces jointes seront envoyées.`
                    : "1 pièce jointe sera envoyée."}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Total :{" "}
                  {formatFileSize(
                    selectedAttachments.reduce((sum, file) => sum + file.size, 0)
                  )}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelSendConfirmation}
                disabled={isEmailSubmitting}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSend()}
                disabled={isEmailSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isEmailSubmitting
                  ? "Envoi en cours..."
                  : isDecisionChangeEmail
                    ? "Envoyer la mise à jour"
                    : requiresSendConfirmation
                      ? "Envoyer quand même"
                      : "Confirmer l'envoi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isContactEmailModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-email-edit-title"
            className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.45)]"
            onSubmit={handleSubmitContactEmailUpdate}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondaryDark">
              Correction administrative
            </p>
            <h2
              id="contact-email-edit-title"
              className="mt-2 text-2xl font-semibold text-slate-900"
            >
              Modifier l'email de contact ?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Cette adresse est utilisée pour le suivi et l'envoi des emails à
              la famille. Corrigez-la uniquement en cas d'erreur de saisie
              constatée.
            </p>

            <label className="mt-5 block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Nouvel email de contact
              </span>
              <input
                type="email"
                value={contactEmailDraft}
                onChange={(event) => {
                  setContactEmailDraft(event.target.value);
                  setContactEmailError(null);
                }}
                className="mt-2 w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-primary/30 focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                placeholder="famille@example.com"
                disabled={isUpdatingContactEmail}
                autoFocus
              />
            </label>

            <div className="mt-4 rounded-[20px] border border-warning/20 bg-warning/10 px-4 py-3 text-sm leading-6 text-slate-700">
              Email actuel :{" "}
              <span className="font-semibold text-slate-900">
                {formatOptionalText(application.family.contactEmail)}
              </span>
            </div>

            {contactEmailError ? (
              <p className="mt-3 rounded-[18px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {contactEmailError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseContactEmailModal}
                disabled={isUpdatingContactEmail}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isUpdatingContactEmail}
                className="inline-flex items-center justify-center rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secondaryDark disabled:cursor-wait disabled:opacity-70"
              >
                {isUpdatingContactEmail ? "Correction..." : "Corriger l'email"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
};

export default ApplicationEmailPage;
