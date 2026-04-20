export type ApplicationStatus =
  | "RECEIVED"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "REFUSED";

export type ApplicationLevel = {
  code: string;
  label: string;
};

export type ApplicationStudent = {
  id: string;
  firstName: string;
  lastName: string;
  level: ApplicationLevel;
};

export type ApplicationFamily = {
  contactEmail: string | null;
  fatherLastName: string | null;
  motherLastName: string | null;
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
