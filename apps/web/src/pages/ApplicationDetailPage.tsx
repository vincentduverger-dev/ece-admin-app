import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import PageSectionHeader from "../components/layout/PageSectionHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import ErrorState from "../components/ui/ErrorState";
import LevelBadge from "../components/ui/LevelBadge";
import LoadingState from "../components/ui/LoadingState";
import PriorityBadge from "../components/ui/PriorityBadge";
import StatusBadge from "../components/ui/StatusBadge";
import { useToast } from "../context/ToastContext";
import {
  getApplicationById,
  getApplicationEmailLogs,
  sendApplicationEmail,
  updateApplicationDecision,
  updateApplicationPriority,
  updateApplicationStatus
} from "../lib/api";
import type {
  ApplicationDecisionStatus,
  ApplicationDetail,
  ApplicationEmailLog,
  ApplicationEmailSendStatus,
  ApplicationEmailSendPayload,
  ApplicationEmailType,
  ApplicationGender,
  ApplicationStatus
} from "../types/application";

const emailTypeLabels: Record<ApplicationEmailType, string> = {
  ACCEPTANCE: "Acceptation",
  REFUSAL: "Refus",
  CUSTOM: "Personnalisé"
};

const emailTypeStyles: Record<ApplicationEmailType, string> = {
  ACCEPTANCE: "bg-success/10 text-success ring-success/20",
  REFUSAL: "bg-danger/10 text-danger ring-danger/20",
  CUSTOM: "bg-slate-100 text-slate-700 ring-slate-200"
};

const emailSendStatusLabels: Record<ApplicationEmailSendStatus, string> = {
  PENDING: "En attente",
  SENT: "Envoyé",
  FAILED: "Échec"
};

const emailSendStatusStyles: Record<ApplicationEmailSendStatus, string> = {
  PENDING: "bg-warning/10 text-warning ring-warning/20",
  SENT: "bg-success/10 text-success ring-success/20",
  FAILED: "bg-danger/10 text-danger ring-danger/20"
};

const genderLabels: Record<ApplicationGender, string> = {
  BOY: "Garçon",
  GIRL: "Fille",
  UNKNOWN: "Non renseigné"
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium"
});

const statusOptions: Array<{
  value: ApplicationStatus;
  label: string;
}> = [
  { value: "RECEIVED", label: "Reçue" },
  { value: "IN_REVIEW", label: "En revue" },
  { value: "ACCEPTED", label: "Acceptée" },
  { value: "REFUSED", label: "Refusée" }
];

const decisionOptions: Array<{
  value: ApplicationDecisionStatus;
  label: string;
}> = [
  { value: "ACCEPTED", label: "Acceptée" },
  { value: "REFUSED", label: "Refusée" }
];

const emailTypeOptions: Array<{
  value: ApplicationEmailType;
  label: string;
}> = [
  { value: "ACCEPTANCE", label: "Acceptation" },
  { value: "REFUSAL", label: "Refus" },
  { value: "CUSTOM", label: "Personnalisé" }
];

const emailTemplates: Record<
  Exclude<ApplicationEmailType, "CUSTOM">,
  {
    subject: string;
    body: string;
  }
> = {
  ACCEPTANCE: {
    subject: "ECE - décision d'admission",
    body: "Votre demande d'inscription a été acceptée."
  },
  REFUSAL: {
    subject: "ECE - décision d'inscription",
    body: "Nous regrettons de vous informer que votre demande n'a pas été retenue."
  }
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError";
};

const getEmailTemplate = (
  emailType: ApplicationEmailType
): {
  subject: string;
  body: string;
} | null => {
  if (emailType === "CUSTOM") {
    return null;
  }

  return emailTemplates[emailType];
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
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  return parts.length > 0 ? parts.join(" ") : "Non renseigné";
};

const getEmailActionErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Impossible d'envoyer l'email.";
  }

  switch (error.message) {
    case "Invalid email type":
      return "Le type d'email sélectionné est invalide.";
    case "Invalid email payload":
      return "Le sujet et le message sont obligatoires.";
    case "Missing recipient email":
      return "Aucune adresse email de contact n'est renseignée pour cette demande.";
    case "Application not found":
      return "Cette demande n'existe pas ou n'est plus accessible.";
    case "Internal server error":
      return "Une erreur serveur est survenue pendant l'envoi de l'email.";
    default:
      return error.message;
  }
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

  return "Famille non renseignée";
};

const DetailField = ({
  label,
  value
}: {
  label: string;
  value: string;
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
};

const SectionCard = ({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
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
  const [selectedEmailType, setSelectedEmailType] =
    useState<ApplicationEmailType>("ACCEPTANCE");
  const [emailSubject, setEmailSubject] = useState(emailTemplates.ACCEPTANCE.subject);
  const [emailBody, setEmailBody] = useState(emailTemplates.ACCEPTANCE.body);
  const [isEmailSubjectDirty, setIsEmailSubjectDirty] = useState(false);
  const [isEmailBodyDirty, setIsEmailBodyDirty] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  const resetEmailForm = useCallback((): void => {
    setSelectedEmailType("ACCEPTANCE");
    setEmailSubject(emailTemplates.ACCEPTANCE.subject);
    setEmailBody(emailTemplates.ACCEPTANCE.body);
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
        resetEmailForm();
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
  }, [applicationId, resetEmailForm]);

  useEffect(() => {
    if (application) {
      setSelectedStatus(application.status);
    }
  }, [application]);

  useEffect(() => {
    const template = getEmailTemplate(selectedEmailType);

    if (!template) {
      return;
    }

    if (!isEmailSubjectDirty) {
      setEmailSubject(template.subject);
    }

    if (!isEmailBodyDirty) {
      setEmailBody(template.body);
    }
  }, [selectedEmailType, isEmailSubjectDirty, isEmailBodyDirty]);

  const handleStatusSubmit = useCallback(async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
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
  }, [application, selectedStatus, showError, showSuccess]);

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

  const handleDecisionSubmit = useCallback(async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!application) {
      return;
    }

    setIsDecisionSubmitting(true);

    const normalizedDecisionNote = decisionNote.trim();

    try {
      const updatedApplication = await updateApplicationDecision(application.id, {
        status: selectedDecisionStatus,
        decisionNote: normalizedDecisionNote.length > 0 ? normalizedDecisionNote : null
      });

      setApplication((currentApplication) => {
        if (!currentApplication || currentApplication.id !== updatedApplication.id) {
          return currentApplication;
        }

        return {
          ...currentApplication,
          status: updatedApplication.status,
          decisionAt: updatedApplication.decisionAt,
          decisionNote: updatedApplication.decisionNote
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
  }, [application, decisionNote, selectedDecisionStatus, showError, showSuccess]);

  const handleEmailSubmit = useCallback(async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!application) {
      return;
    }

    const normalizedSubject = emailSubject.trim();
    const normalizedBody = emailBody.trim();

    if (normalizedSubject.length === 0) {
      showError("Le sujet est obligatoire.");
      return;
    }

    if (normalizedBody.length === 0) {
      showError("Le message est obligatoire.");
      return;
    }

    setIsEmailSubmitting(true);

    const payload: ApplicationEmailSendPayload = {
      emailType: selectedEmailType,
      subject: normalizedSubject,
      body: normalizedBody
    };

    try {
      const createdEmailLog = await sendApplicationEmail(application.id, payload);

      setEmailLogs((currentEmailLogs) => [createdEmailLog, ...currentEmailLogs]);
      resetEmailForm();
      showSuccess("L'email a été envoyé et enregistré dans l'historique.");
    } catch (sendError) {
      showError(getEmailActionErrorMessage(sendError));
    } finally {
      setIsEmailSubmitting(false);
    }
  }, [
    application,
    emailBody,
    emailSubject,
    resetEmailForm,
    selectedEmailType,
    showError,
    showSuccess
  ]);

  const pageTopBar = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Demandes", href: "/applications" },
          { label: "Détail" }
        ]}
      />
      <Link
        to="/applications"
        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Retour aux demandes
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
          eyebrow="Demande d'inscription"
          title={getApplicationFamilyTitle(null)}
          description="Consultation détaillée d'une demande, de sa composition familiale, des élèves rattachés et de l'historique email."
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
          description="Consultation détaillée d'une demande, de sa composition familiale, des élèves rattachés et de l'historique email."
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

  return (
    <>
      <PageSectionHeader
        topBar={pageTopBar}
        eyebrow="Demande d'inscription"
        title={getApplicationFamilyTitle(application)}
        description="Consultation détaillée d'une demande, de sa composition familiale, des élèves rattachés et de l'historique email."
        aside={pageHeaderAside}
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Demande"
          subtitle="Informations générales du dossier et état actuel de la décision."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="Identifiant" value={application.id} />
            <DetailField
              label="Créée le"
              value={formatOptionalDateTime(application.createdAt)}
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Statut
              </p>
              <div className="mt-2">
                <StatusBadge status={application.status} />
              </div>
            </div>
            <DetailField
              label="Priorité"
              value={application.isPriority ? "Oui" : "Non"}
            />
            <DetailField
              label="Décision prise le"
              value={formatOptionalDateTime(application.decisionAt)}
            />
            <DetailField
              label="Note de décision"
              value={formatOptionalText(application.decisionNote)}
            />
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Actions"
            subtitle="Mettre à jour le statut administratif, la priorité, la décision finale et les emails sans recharger toute l'application."
          >
            <form className="space-y-4" onSubmit={handleStatusSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="application-status"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Nouveau statut
                </label>
                <select
                  id="application-status"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as ApplicationStatus)
                  }
                  disabled={isStatusSubmitting}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-primary/40 focus:bg-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Statut actuel
                </p>
                <div className="mt-2">
                  <StatusBadge status={application.status} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isStatusSubmitting || selectedStatus === application.status}
                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isStatusSubmitting ? "Mise à jour..." : "Mettre à jour le statut"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Priorité actuelle
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <PriorityBadge isPriority={application.isPriority} />
                    {!application.isPriority ? (
                      <span className="text-sm text-slate-600">Aucune priorité</span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePriorityToggle}
                  disabled={isPrioritySubmitting}
                  className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {isPrioritySubmitting
                    ? "Mise à jour..."
                    : application.isPriority
                      ? "Désactiver la priorité"
                      : "Activer la priorité"}
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <form className="space-y-4" onSubmit={handleDecisionSubmit}>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Décision finale
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Enregistrer une acceptation ou un refus définitif avec une note
                    optionnelle.
                  </p>
                </div>

                <div className="space-y-2">
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-primary/40 focus:bg-white"
                  >
                    {decisionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="application-decision-note"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  >
                    Note de décision
                  </label>
                  <textarea
                    id="application-decision-note"
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    disabled={isDecisionSubmitting}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:bg-white"
                    placeholder="Ajouter une note visible dans le détail de la demande."
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Décision actuellement visible
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <StatusBadge status={application.status} />
                    <span className="text-sm text-slate-600">
                      {formatOptionalDateTime(application.decisionAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {formatOptionalText(application.decisionNote)}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isDecisionSubmitting}
                  className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isDecisionSubmitting
                    ? "Enregistrement..."
                    : "Enregistrer la décision finale"}
                </button>
              </form>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <form className="space-y-4" onSubmit={handleEmailSubmit}>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Envoyer un email
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Enregistrer un email envoyé et rafraîchir immédiatement
                    l'historique visible.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="application-email-type"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  >
                    Type d'email
                  </label>
                  <select
                    id="application-email-type"
                    value={selectedEmailType}
                    onChange={(event) => {
                      handleEmailTypeChange(
                        event.target.value as ApplicationEmailType
                      );
                    }}
                    disabled={isEmailSubmitting}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-primary/40 focus:bg-white"
                  >
                    {emailTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="application-email-subject"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  >
                    Sujet
                  </label>
                  <input
                    id="application-email-subject"
                    type="text"
                    value={emailSubject}
                    onChange={(event) => {
                      setEmailSubject(event.target.value);
                      setIsEmailSubjectDirty(true);
                    }}
                    disabled={isEmailSubmitting}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:bg-white"
                    placeholder={
                      selectedEmailType === "CUSTOM"
                          ? "Saisir un sujet personnalisé"
                          : "ECE - décision d'admission"
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="application-email-body"
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                    >
                      Message
                    </label>
                    <textarea
                      id="application-email-body"
                      value={emailBody}
                      onChange={(event) => {
                        setEmailBody(event.target.value);
                        setIsEmailBodyDirty(true);
                      }}
                      disabled={isEmailSubmitting}
                      rows={5}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:bg-white"
                      placeholder={
                        selectedEmailType === "CUSTOM"
                          ? "Saisir votre message personnalisé."
                          : "Votre demande a été acceptée."
                      }
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isEmailSubmitting}
                    className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isEmailSubmitting ? "Envoi en cours..." : "Envoyer l'email"}
                  </button>
                </form>
              </div>
            </SectionCard>

            <SectionCard
              title="Année scolaire"
              subtitle="Campagne d'inscription associée à cette demande."
            >
              <div className="grid gap-4">
                <DetailField label="Libellé" value={application.schoolYear.label} />
                <DetailField
                  label="Statut"
                  value={application.schoolYear.isActive ? "Année active" : "Historique"}
                />
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Famille"
            subtitle="Coordonnées et informations de contact utilisées par l'administration."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <DetailField
                label="Email de contact"
                value={formatOptionalText(application.family.contactEmail)}
              />
              <DetailField
                label="Téléphone"
                value={formatOptionalText(application.family.contactPhone)}
              />
              <DetailField
                label="Père"
                value={formatParentName(
                  application.family.fatherFirstName,
                  application.family.fatherLastName
                )}
              />
              <DetailField
                label="Mère"
                value={formatParentName(
                  application.family.motherFirstName,
                  application.family.motherLastName
                )}
              />
              <DetailField
                label="Situation familiale"
                value={formatOptionalText(application.family.familyStatus)}
              />
              <DetailField
                label="Adresse postale"
                value={formatOptionalText(application.family.postalAddress)}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Élèves"
            subtitle="Enfants rattachés à la demande et niveaux demandés."
          >
            {application.students.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
                Aucun élève n'est rattaché à cette demande.
              </p>
            ) : (
              <div className="space-y-4">
                {application.students.map((student) => (
                  <article
                    key={student.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {student.firstName} {student.lastName}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-sm text-slate-500">{student.level.label}</p>
                          <LevelBadge
                            code={student.level.code}
                            label={student.level.label}
                            size="sm"
                          />
                        </div>
                      </div>
                      {student.rankInForm ? (
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                          Rang {student.rankInForm}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DetailField label="Genre" value={genderLabels[student.gender]} />
                      <DetailField
                        label="Date de naissance"
                        value={formatOptionalDate(student.birthDate)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="mt-6">
          <SectionCard
            title="Historique email"
            subtitle="Logs métiers des emails envoyés ou simulés pour cette demande."
          >
            {emailLogs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-slate-500">
                Aucun email n'a encore été enregistré pour cette demande.
              </p>
            ) : (
              <div className="space-y-4">
                {emailLogs.map((emailLog) => (
                  <article
                    key={emailLog.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {emailLog.subject}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${emailTypeStyles[emailLog.emailType]}`}
                          >
                            {emailTypeLabels[emailLog.emailType]}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${emailSendStatusStyles[emailLog.sendStatus]}`}
                          >
                            {emailSendStatusLabels[emailLog.sendStatus]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          Destinataire : {emailLog.recipientEmail}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <DetailField
                        label="Type d'email"
                        value={emailTypeLabels[emailLog.emailType]}
                      />
                      <DetailField
                        label="Statut d'envoi"
                        value={emailSendStatusLabels[emailLog.sendStatus]}
                      />
                      <DetailField
                        label="Envoyé le"
                        value={formatOptionalDateTime(emailLog.sentAt)}
                      />
                      <DetailField
                        label="Log créé le"
                        value={formatOptionalDateTime(emailLog.createdAt)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
    </>
  );
};

export default ApplicationDetailPage;
