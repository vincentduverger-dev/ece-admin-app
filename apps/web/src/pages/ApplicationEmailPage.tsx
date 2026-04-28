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
  type PersonAvatarVariant
} from "../components/ui/PersonAvatar";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { useToast } from "../context/ToastContext";
import {
  getApplicationById,
  getApplicationEmailLogs,
  sendApplicationEmail
} from "../lib/api";
import {
  applicationEmailSendStatusLabels,
  applicationEmailSendStatusStyles,
  applicationEmailTemplates,
  applicationEmailTypeLabels,
  applicationEmailTypeOptions,
  applicationEmailTypeStyles,
  getApplicationEmailActionErrorMessage,
  getApplicationDecisionEmailContext,
  getApplicationDecisionEmailTemplate
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
  const { showError, showSuccess } = useToast();
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

  const resetEmailForm = useCallback((nextApplication?: ApplicationDetail): void => {
    if (!nextApplication) {
      setSelectedEmailType("ACCEPTANCE");
      setEmailSubject(applicationEmailTemplates.ACCEPTANCE.subject);
      setEmailBody(applicationEmailTemplates.ACCEPTANCE.body);
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
        resetEmailForm(applicationData);
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

    const template = getApplicationDecisionEmailTemplate(application, selectedEmailType);

    if (!template) {
      return;
    }

    if (!isEmailSubjectDirty) {
      setEmailSubject(template.subject);
    }

    if (!isEmailBodyDirty) {
      setEmailBody(template.body);
    }
  }, [application, selectedEmailType, isEmailSubjectDirty, isEmailBodyDirty]);

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

      return {
        emailType: selectedEmailType,
        subject: normalizedSubject,
        body: normalizedBody
      };
    }, [application, emailBody, emailSubject, selectedEmailType, showError]);

  const sendValidatedEmail = useCallback(
    async (payload: ApplicationEmailSendPayload): Promise<void> => {
      if (!application) {
        return;
      }

      setIsEmailSubmitting(true);

      try {
        const createdEmailLog = await sendApplicationEmail(application.id, payload);

        setEmailLogs((currentEmailLogs) => [createdEmailLog, ...currentEmailLogs]);
        resetEmailForm(application);
        setIsSendConfirmationOpen(false);
        showSuccess("L'email a été envoyé et enregistré dans l'historique.");
      } catch (sendError) {
        showError(getApplicationEmailActionErrorMessage(sendError));
      } finally {
        setIsEmailSubmitting(false);
      }
    },
    [application, resetEmailForm, showError, showSuccess]
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

      const recommendedEmailType =
        getApplicationDecisionEmailContext(application).recommendedEmailType;
      const requiresSendConfirmation = getRequiresSendConfirmation(
        selectedEmailType,
        recommendedEmailType
      );

      if (requiresSendConfirmation) {
        setIsSendConfirmationOpen(true);
        return;
      }

      await sendValidatedEmail(payload);
    },
    [application, getValidatedEmailPayload, selectedEmailType, sendValidatedEmail]
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

  useEffect(() => {
    setIsSendConfirmationOpen(false);
  }, [selectedEmailType, emailSubject, emailBody]);

  const detailPath = applicationId ? `/applications/${applicationId}` : "/applications";
  const latestEmailLogs = useMemo(() => emailLogs.slice(0, 4), [emailLogs]);
  const decisionEmailContext = useMemo(() => {
    return application ? getApplicationDecisionEmailContext(application) : null;
  }, [application]);
  const recommendedEmailType =
    decisionEmailContext?.recommendedEmailType ?? selectedEmailType;
  const applicationFamilyTitle = useMemo(
    () => getApplicationFamilyTitle(application),
    [application]
  );
  const isCustomEmail = selectedEmailType === "CUSTOM";
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
              <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                {formatOptionalText(application.family.contactEmail)}
              </p>
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
                  {
                    applicationEmailTypeLabels[
                      decisionEmailContext.recommendedEmailType
                    ]
                  }
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

            {isCustomEmail ? (
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
              {formatOptionalText(application.family.contactEmail)}
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
          title="Historique récent"
          subtitle="Derniers emails enregistrés pour cette demande."
          className="xl:col-span-2"
          motionDelay={300}
        >
          {latestEmailLogs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
              Aucun email n'a encore été enregistré pour cette demande.
            </p>
          ) : (
            <div className="space-y-3">
              {latestEmailLogs.map((emailLog) => (
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
              Confirmer l'envoi d'un email non recommandé
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isCustomEmail
                ? "Vous envoyez un email personnalisé. Vérifiez attentivement le contenu avant l'envoi."
                : "Le type d'email sélectionné ne correspond pas à la décision actuelle du dossier. Cet envoi peut transmettre une information incorrecte à la famille."}
            </p>

            {requiresSendConfirmation ? (
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
                {isEmailSubmitting ? "Envoi en cours..." : "Envoyer quand même"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ApplicationEmailPage;
