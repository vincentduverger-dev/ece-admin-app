import type {
  ApplicationDetail,
  ApplicationEmailLog,
  ApplicationEmailSendStatus,
  ApplicationEmailType,
  StudentAdmissionStatus
} from "../types/application";

export const applicationEmailTypeLabels: Record<ApplicationEmailType, string> = {
  ACCEPTANCE: "Acceptation",
  REFUSAL: "Liste d'attente",
  WAITLIST: "Liste d'attente",
  PARTIAL_DECISION: "Décision partielle",
  CUSTOM: "Personnalisé"
};

export const applicationEmailTypeStyles: Record<ApplicationEmailType, string> = {
  ACCEPTANCE: "bg-success/10 text-success ring-success/20",
  REFUSAL: "bg-info/10 text-info ring-info/20",
  WAITLIST: "bg-info/10 text-info ring-info/20",
  PARTIAL_DECISION: "bg-info/10 text-info ring-info/20",
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
  { value: "WAITLIST", label: "Liste d'attente" },
  { value: "PARTIAL_DECISION", label: "Décision partielle" },
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
    subject: "ECE - décision concernant votre demande d'inscription",
    body: "Votre demande est actuellement placée en liste d'attente, dans l'attente d'une place disponible."
  },
  WAITLIST: {
    subject: "ECE - décision concernant votre demande d'inscription",
    body: "Votre demande est actuellement placée en liste d'attente, dans l'attente d'une place disponible."
  },
  PARTIAL_DECISION: {
    subject: "ECE - décision concernant votre demande d'inscription",
    body: "Nous vous informons de la décision concernant votre demande d'inscription."
  }
};

type DecisionEmailWarningTone = "warning" | "info";

export type ApplicationDecisionEmailContext = {
  recommendedEmailType: ApplicationEmailType;
  warnings: Array<{
    message: string;
    tone: DecisionEmailWarningTone;
  }>;
};

const studentDecisionSectionLabels: Record<
  StudentAdmissionStatus,
  string | null
> = {
  ACCEPTED: "Enfant(s) accepté(s) :",
  REFUSED: "Enfant(s) en liste d'attente :",
  WAITLISTED: "Enfant(s) en liste d'attente :",
  PENDING: "Enfant(s) encore en attente de décision :"
};

const formatStudentLine = (
  student: ApplicationDetail["students"][number]
): string => {
  return `- ${student.firstName} ${student.lastName} — ${student.level.label}`;
};

const applicationStatusLabels = {
  ACCEPTED: "Acceptée",
  PARTIALLY_ACCEPTED: "Décision communiquée",
  WAITLISTED: "Liste d'attente",
  REFUSED: "Liste d'attente",
  IN_REVIEW: "En revue",
  RECEIVED: "En revue"
} satisfies Record<ApplicationDetail["status"], string>;

const decisionStatusPhraseLabels: Record<StudentAdmissionStatus, string> = {
  ACCEPTED: "accepté(e)",
  REFUSED: "en liste d'attente",
  WAITLISTED: "en liste d'attente",
  PENDING: "en attente"
};

const decisionEmailTypes = new Set<ApplicationEmailType>([
  "ACCEPTANCE",
  "REFUSAL",
  "WAITLIST",
  "PARTIAL_DECISION"
]);

const normalizeDecisionStudentName = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
};

const getStudentFullName = (
  student: ApplicationDetail["students"][number]
): string => {
  return `${student.firstName} ${student.lastName}`.trim();
};

const getStudentDecisionStatus = (
  student: ApplicationDetail["students"][number]
): StudentAdmissionStatus => {
  return student.admissionStatus ?? "PENDING";
};

const isSentDecisionEmailLog = (emailLog: ApplicationEmailLog): boolean => {
  return (
    emailLog.sendStatus === "SENT" &&
    decisionEmailTypes.has(emailLog.emailType)
  );
};

const getEmailLogDateValue = (emailLog: ApplicationEmailLog): number => {
  return new Date(emailLog.sentAt ?? emailLog.createdAt).getTime();
};

const parseDecisionEmailSnapshot = (
  bodySnapshot: string
): Map<string, StudentAdmissionStatus> => {
  const studentStatuses = new Map<string, StudentAdmissionStatus>();
  let currentStatus: StudentAdmissionStatus | null = null;

  bodySnapshot.split(/\r?\n/u).forEach((rawLine) => {
    const line = rawLine.trim();
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes("enfant") && lowerLine.includes("accept")) {
      currentStatus = "ACCEPTED";
      return;
    }

    if (lowerLine.includes("enfant") && lowerLine.includes("liste d'attente")) {
      currentStatus = "WAITLISTED";
      return;
    }

    if (lowerLine.includes("enfant") && lowerLine.includes("attente de décision")) {
      currentStatus = "PENDING";
      return;
    }

    if (!currentStatus || !line.startsWith("-")) {
      return;
    }

    const studentName = line
      .replace(/^-\s*/u, "")
      .split(/\s+[—-]\s+/u)[0]
      .trim();

    if (studentName.length > 0) {
      studentStatuses.set(normalizeDecisionStudentName(studentName), currentStatus);
    }
  });

  return studentStatuses;
};

export const getLatestSentDecisionEmailLog = (
  emailLogs: ApplicationEmailLog[]
): ApplicationEmailLog | null => {
  const sentDecisionEmailLogs = emailLogs.filter(isSentDecisionEmailLog);

  if (sentDecisionEmailLogs.length === 0) {
    return null;
  }

  return [...sentDecisionEmailLogs].sort(
    (leftEmailLog, rightEmailLog) =>
      getEmailLogDateValue(rightEmailLog) - getEmailLogDateValue(leftEmailLog)
  )[0];
};

const formatStudentSection = (
  title: string,
  students: ApplicationDetail["students"]
): string | null => {
  if (students.length === 0) {
    return null;
  }

  return [title, ...students.map(formatStudentLine)].join("\n");
};

const getStudentsByAdmissionStatus = (
  application: ApplicationDetail
): Record<StudentAdmissionStatus, ApplicationDetail["students"]> => {
  return {
    ACCEPTED: application.students.filter(
      (student) => student.admissionStatus === "ACCEPTED"
    ),
    REFUSED: application.students.filter(
      (student) => student.admissionStatus === "REFUSED"
    ),
    WAITLISTED: application.students.filter(
      (student) =>
        student.admissionStatus === "WAITLISTED" ||
        student.admissionStatus === "REFUSED"
    ),
    PENDING: application.students.filter(
      (student) => student.admissionStatus === "PENDING"
    )
  };
};

export const getApplicationDecisionEmailContext = (
  application: ApplicationDetail
): ApplicationDecisionEmailContext => {
  const studentsByStatus = getStudentsByAdmissionStatus(application);
  const hasStudents = application.students.length > 0;
  const allAccepted =
    hasStudents && studentsByStatus.ACCEPTED.length === application.students.length;
  const allWaitlisted =
    hasStudents && studentsByStatus.WAITLISTED.length === application.students.length;
  const allPending =
    hasStudents && studentsByStatus.PENDING.length === application.students.length;
  const hasPending = studentsByStatus.PENDING.length > 0;
  const warnings: ApplicationDecisionEmailContext["warnings"] = [];

  if (!hasStudents) {
    warnings.push({
      message: "Aucun élève n'est rattaché à cette demande.",
      tone: "warning"
    });

    return {
      recommendedEmailType: "CUSTOM",
      warnings
    };
  }

  if (allPending) {
    warnings.push({
      message:
        "Aucune décision d'admission n'a encore été enregistrée pour les élèves de cette demande.",
      tone: "warning"
    });

    return {
      recommendedEmailType: "CUSTOM",
      warnings
    };
  }

  if (hasPending) {
    warnings.push({
      message: "Attention : certains élèves sont encore en attente de décision.",
      tone: "warning"
    });
  }

  if (allAccepted) {
    return {
      recommendedEmailType: "ACCEPTANCE",
      warnings
    };
  }

  if (allWaitlisted) {
    return {
      recommendedEmailType: "WAITLIST",
      warnings
    };
  }

  warnings.push({
    message:
      "Cette demande contient des décisions différentes selon les élèves. Le message a été préparé en décision partielle.",
    tone: "info"
  });

  return {
    recommendedEmailType: "PARTIAL_DECISION",
    warnings
  };
};

export const getApplicationDecisionEmailTemplate = (
  application: ApplicationDetail,
  emailType: ApplicationEmailType
): {
  subject: string;
  body: string;
} | null => {
  if (emailType === "CUSTOM") {
    return null;
  }

  const studentsByStatus = getStudentsByAdmissionStatus(application);

  if (emailType === "ACCEPTANCE") {
    return {
      subject: applicationEmailTemplates.ACCEPTANCE.subject,
      body: [
        "Bonjour,",
        "",
        "Nous avons le plaisir de vous informer que la demande d'inscription de votre/vos enfant(s) a été acceptée.",
        "",
        formatStudentSection("Enfant(s) accepté(s) :", application.students),
        "",
        "Cordialement,",
        "L'administration de l'École de la Culture et de l'Éducation"
      ]
        .filter((line): line is string => line !== null)
        .join("\n")
    };
  }

  if (emailType === "WAITLIST" || emailType === "REFUSAL") {
    return {
      subject: applicationEmailTemplates.WAITLIST.subject,
      body: [
        "Bonjour,",
        "",
        "Nous vous informons que la demande d'inscription de votre/vos enfant(s) est actuellement placée en liste d'attente, dans l'attente d'une place disponible.",
        "",
        formatStudentSection("Enfant(s) en liste d'attente :", application.students),
        "",
        "Cordialement,",
        "L'administration de l'École de la Culture et de l'Éducation"
      ]
        .filter((line): line is string => line !== null)
        .join("\n")
    };
  }

  const sections = (["ACCEPTED", "WAITLISTED", "PENDING"] as const)
    .map((status) => {
      const title = studentDecisionSectionLabels[status];

      return title ? formatStudentSection(title, studentsByStatus[status]) : null;
    })
    .filter((section): section is string => section !== null);

  return {
    subject: applicationEmailTemplates.PARTIAL_DECISION.subject,
    body: [
      "Bonjour,",
      "",
      "Nous vous informons de la décision concernant votre demande d'inscription.",
      "",
      sections.join("\n\n"),
      "",
      "Cordialement,",
      "L'administration de l'École de la Culture et de l'Éducation"
    ].join("\n")
  };
};

export const getApplicationDecisionChangeEmailTemplate = (
  application: ApplicationDetail,
  previousDecisionEmailLog: ApplicationEmailLog
): {
  subject: string;
  body: string;
  changedStudentsCount: number;
} => {
  const previousStudentStatuses = parseDecisionEmailSnapshot(
    previousDecisionEmailLog.bodySnapshot
  );
  const changedStudents = application.students
    .map((student) => {
      const studentName = getStudentFullName(student);
      const previousStatus = previousStudentStatuses.get(
        normalizeDecisionStudentName(studentName)
      );
      const currentStatus = getStudentDecisionStatus(student);

      if (!previousStatus || previousStatus === currentStatus) {
        return null;
      }

      return `- ${studentName}, qui était ${decisionStatusPhraseLabels[previousStatus]}, est finalement ${decisionStatusPhraseLabels[currentStatus]}.`;
    })
    .filter((line): line is string => line !== null);
  const currentDecisionSections = ([
    "ACCEPTED",
    "WAITLISTED",
    "PENDING"
  ] as const)
    .map((status) => {
      const title = studentDecisionSectionLabels[status];

      if (!title) {
        return null;
      }

      return formatStudentSection(
        title,
        application.students.filter(
          (student) =>
            status === "WAITLISTED"
              ? getStudentDecisionStatus(student) === "WAITLISTED" ||
                getStudentDecisionStatus(student) === "REFUSED"
              : getStudentDecisionStatus(student) === status
        )
      );
    })
    .filter((section): section is string => section !== null);

  return {
    subject: "ECE - mise à jour de votre demande d'inscription",
    changedStudentsCount: changedStudents.length,
    body: [
      "Bonjour,",
      "",
      "Le traitement de votre demande d'inscription a été modifié depuis notre précédent email.",
      "",
      changedStudents.length > 0
        ? ["Changement(s) effectué(s) :", ...changedStudents].join("\n")
        : "La décision de votre demande a été mise à jour. Vous trouverez le récapitulatif actuel ci-dessous.",
      "",
      "Récapitulatif actuel de la demande :",
      `Année scolaire : ${application.schoolYear.label}`,
      `Statut du dossier : ${applicationStatusLabels[application.status]}`,
      "",
      currentDecisionSections.join("\n\n"),
      "",
      "Cordialement,",
      "L'administration de l'École de la Culture et de l'Éducation"
    ].join("\n")
  };
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
