export type ApplicationStatus =
  | "RECEIVED"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "REFUSED";

export type ApplicationDecisionStatus = "ACCEPTED" | "REFUSED";

export type ApplicationLevel = {
  code: string;
  label: string;
};

export type ApplicationGender = "BOY" | "GIRL" | "UNKNOWN";
export type ApplicationEmailType = "ACCEPTANCE" | "REFUSAL" | "CUSTOM";
export type ApplicationEmailSendStatus = "PENDING" | "SENT" | "FAILED";

export type ApplicationStudent = {
  id: string;
  firstName: string;
  lastName: string;
  level: ApplicationLevel;
};

export type ApplicationDetailStudent = ApplicationStudent & {
  gender: ApplicationGender;
  birthDate: string;
  rankInForm: number | null;
};

export type ApplicationFamily = {
  contactEmail: string | null;
  fatherLastName: string | null;
  motherLastName: string | null;
};

export type ApplicationDetailFamily = ApplicationFamily & {
  contactPhone: string | null;
  fatherFirstName: string | null;
  motherFirstName: string | null;
  postalAddress: string | null;
  familyStatus: string | null;
};

export type ApplicationSchoolYear = {
  id: string;
  label: string;
  isActive: boolean;
};

export type ApplicationListItem = {
  id: string;
  status: ApplicationStatus;
  isPriority: boolean;
  createdAt: string;
  family: ApplicationFamily;
  schoolYear: ApplicationSchoolYear;
  students: ApplicationStudent[];
};

export type ApplicationDetail = {
  id: string;
  status: ApplicationStatus;
  isPriority: boolean;
  createdAt: string;
  decisionAt: string | null;
  decisionNote: string | null;
  family: ApplicationDetailFamily;
  schoolYear: ApplicationSchoolYear;
  students: ApplicationDetailStudent[];
};

export type ApplicationEmailLog = {
  id: string;
  applicationId: string;
  emailType: ApplicationEmailType;
  recipientEmail: string;
  subject: string;
  bodySnapshot: string;
  sentAt: string | null;
  sendStatus: ApplicationEmailSendStatus;
  createdAt: string;
};

export type ApplicationEmailSendPayload = {
  emailType: ApplicationEmailType;
  subject: string;
  body: string;
};

export type ApplicationStatusUpdateResult = {
  id: string;
  status: ApplicationStatus;
};

export type ApplicationPriorityUpdateResult = {
  id: string;
  isPriority: boolean;
};

export type ApplicationDecisionUpdatePayload = {
  status: ApplicationDecisionStatus;
  decisionNote?: string | null;
};

export type ApplicationDecisionUpdateResult = {
  id: string;
  status: ApplicationDecisionStatus;
  decisionAt: string | null;
  decisionNote: string | null;
};

export type ApplicationFilterParams = {
  status?: ApplicationStatus;
  schoolYearId?: string;
  isPriority?: "true" | "false";
  search?: string;
};

export type SchoolYearSummary = {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
