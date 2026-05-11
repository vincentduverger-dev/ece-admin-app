import type {
  ApplicationStatus,
  StudentAdmissionStatus
} from "./application";

export type DashboardApplicationStatus = ApplicationStatus;

export type DashboardStats = {
  totalApplications: number;
  waitlistedStudents: number;
  byStatus: Record<DashboardApplicationStatus, number>;
  byLevel: DashboardLevelStat[];
  priorityApplications: DashboardPriorityApplication[];
  studentStats?: DashboardStudentStats;
};

export type DashboardLevelStat = {
  id?: string;
  code: string;
  label: string;
  count: number;
  requestedStudentsCount?: number;
  acceptedStudentsCount?: number;
  availablePlaces?: number;
  isCapacityConfigured?: boolean;
  remainingPlaces?: number;
};

export type DashboardPriorityApplication = {
  id: string;
  status: DashboardApplicationStatus;
  isPriority: boolean;
  createdAt: string;
  family: {
    contactEmail: string | null;
    fatherLastName: string | null;
    motherLastName: string | null;
  };
  schoolYear: {
    label: string;
    isActive: boolean;
  };
  students: DashboardPriorityStudent[];
};

export type DashboardPriorityStudent = {
  id?: string;
  firstName: string;
  lastName: string;
  admissionStatus?: StudentAdmissionStatus;
  isPriority?: boolean;
  level: {
    id?: string;
    code: string;
    label: string;
  };
};

export type DashboardStudentStats = {
  totalStudents: number;
  acceptedStudents: number;
  waitlistedStudents: number;
  byLevel: DashboardLevelStat[];
  priorityStudents: Array<DashboardPriorityStudent & {
    application: {
      id: string;
      isPriority: boolean;
      createdAt: string;
      schoolYear: DashboardPriorityApplication["schoolYear"];
      family: DashboardPriorityApplication["family"];
    };
  }>;
};
