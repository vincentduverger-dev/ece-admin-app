import type {
  ApplicationEmailSendStatus,
  ApplicationEmailType
} from "../types/application";

export const applicationEmailTypeLabels: Record<ApplicationEmailType, string> = {
  ACCEPTANCE: "Acceptation",
  REFUSAL: "Refus",
  CUSTOM: "Personnalisé"
};

export const applicationEmailTypeStyles: Record<ApplicationEmailType, string> = {
  ACCEPTANCE: "bg-success/10 text-success ring-success/20",
  REFUSAL: "bg-danger/10 text-danger ring-danger/20",
  CUSTOM: "bg-slate-100 text-slate-700 ring-slate-200"
};

export const applicationEmailSendStatusLabels: Record<
  ApplicationEmailSendStatus,
  string
> = {
  PENDING: "En attente",
  SENT: "Envoyé",
  FAILED: "Échec"
};

export const applicationEmailSendStatusStyles: Record<
  ApplicationEmailSendStatus,
  string
> = {
  PENDING: "bg-warning/10 text-warning ring-warning/20",
  SENT: "bg-success/10 text-success ring-success/20",
  FAILED: "bg-danger/10 text-danger ring-danger/20"
};

export const applicationEmailTypeOptions: Array<{
  value: ApplicationEmailType;
  label: string;
}> = [
  { value: "ACCEPTANCE", label: "Acceptation" },
  { value: "REFUSAL", label: "Refus" },
  { value: "CUSTOM", label: "Personnalisé" }
];

export const applicationEmailTemplates: Record<
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

export const getApplicationEmailTemplate = (
  emailType: ApplicationEmailType
): {
  subject: string;
  body: string;
} | null => {
  if (emailType === "CUSTOM") {
    return null;
  }

  return applicationEmailTemplates[emailType];
};

export const getApplicationEmailActionErrorMessage = (error: unknown): string => {
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
