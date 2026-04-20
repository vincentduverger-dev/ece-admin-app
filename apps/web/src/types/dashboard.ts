import type { ApplicationStatus } from "./application";

export type DashboardApplicationStatus = ApplicationStatus;

export type DashboardStats = {
  totalApplications: number;
  byStatus: Record<DashboardApplicationStatus, number>;
  byLevel: DashboardLevelStat[];
  priorityApplications: DashboardPriorityApplication[];
};

export type DashboardLevelStat = {
  code: string;
  label: string;
  count: number;
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
  firstName: string;
  lastName: string;
  level: {
    code: string;
    label: string;
  };
};
