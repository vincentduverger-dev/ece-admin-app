export type ApplicationStatus =
  | "RECEIVED"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "REFUSED"
  | "WAITLISTED"
  | "PARTIALLY_ACCEPTED";

export type ApplicationDecisionStatus = "ACCEPTED" | "WAITLISTED";
export type StudentAdmissionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REFUSED"
  | "WAITLISTED";

export type VisibleStudentAdmissionStatus = "ACCEPTED" | "WAITLISTED";

export type ApplicationLevel = {
  id?: string;
  code: string;
  label: string;
};

export type LevelSummary = ApplicationLevel & {
  id: string;
  sortOrder: number;
  availablePlaces: number;
};

export type LevelCapacitySummary = {
  id: string | null;
  schoolYearId: string;
  levelId: string;
  availablePlaces: number;
  createdAt: string | null;
  updatedAt: string | null;
  level: LevelSummary;
};

export type UpdateLevelCapacitiesPayload = {
  capacities: Array<{
    levelId: string;
    availablePlaces: number;
  }>;
};

export type ApplicationGender = "BOY" | "GIRL" | "UNKNOWN";
export type ApplicationEmailType =
  | "ACCEPTANCE"
  | "REFUSAL"
  | "WAITLIST"
  | "PARTIAL_DECISION"
  | "CUSTOM";
export type ApplicationEmailSendStatus = "PENDING" | "SENT" | "FAILED";

export type ApplicationStudent = {
  id: string;
  firstName: string;
  lastName: string;
  gender: ApplicationGender;
  admissionStatus: StudentAdmissionStatus;
  isPriority: boolean;
  level: ApplicationLevel;
};

export type ApplicationDetailStudent = ApplicationStudent & {
  birthDate: string;
  rankInForm: number | null;
};

export type ApplicationFamily = {
  id?: string;
  contactEmail: string | null;
  contactPhone?: string | null;
  fatherLastName: string | null;
  fatherFirstName?: string | null;
  motherLastName: string | null;
  motherFirstName?: string | null;
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
  syncDecisionAt?: boolean;
};

export type ReadyEmailType = "ACCEPTANCE" | "WAITLIST" | "PARTIAL_DECISION";

export type ReadyEmailApplicationStudent = {
  id: string;
  firstName: string;
  lastName: string;
  admissionStatus: Extract<StudentAdmissionStatus, "ACCEPTED" | "WAITLISTED">;
  level: ApplicationLevel;
};

export type ReadyEmailApplication = {
  id: string;
  status: ApplicationStatus;
  decisionAt: string | null;
  family: ApplicationFamily;
  students: ReadyEmailApplicationStudent[];
  recommendedEmailType: ReadyEmailType;
  hasSentEmail: boolean;
  lastEmailSentAt: string | null;
};

export type ReadyEmailApplicationFilterParams = {
  schoolYearId?: string;
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

export type StudentAdmissionStatusUpdateResult = {
  student: ApplicationDetailStudent;
  applicationStatus: ApplicationStatus;
};

export type StudentListItem = {
  id: string;
  applicationId: string;
  levelId: string;
  firstName: string;
  lastName: string;
  gender: ApplicationGender;
  birthDate: string;
  rankInForm: number | null;
  admissionStatus: StudentAdmissionStatus;
  isPriority: boolean;
  createdAt: string;
  updatedAt: string;
  level: LevelSummary;
  application: {
    id: string;
    status: ApplicationStatus;
    isPriority: boolean;
    createdAt: string;
    submittedAt: string;
    schoolYear: ApplicationSchoolYear;
    family: ApplicationDetailFamily & { id: string };
  };
};

export type StudentListResponse = {
  data: StudentListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type StudentFilterParams = {
  search?: string;
  status?: VisibleStudentAdmissionStatus;
  levelId?: string;
  schoolYearId?: string;
  isPriority?: "true" | "false";
  familyId?: string;
  page?: string;
  limit?: string;
  sortBy?: "lastName" | "firstName" | "level" | "birthDate" | "submittedAt" | "status";
  sortOrder?: "asc" | "desc";
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

export type CreateSchoolYearPayload = {
  label: string;
  isActive?: boolean;
};
