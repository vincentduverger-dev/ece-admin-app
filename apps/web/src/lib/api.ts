import type {
  ApplicationDecisionUpdatePayload,
  ApplicationDecisionUpdateResult,
  ApplicationDetail,
  ApplicationEmailSendPayload,
  ApplicationFilterParams,
  ApplicationEmailLog,
  ApplicationListItem,
  LevelCapacitySummary,
  LevelSummary,
  ApplicationContactEmailUpdateResult,
  ApplicationPriorityUpdateResult,
  ApplicationStatus,
  ApplicationStatusUpdateResult,
  CreateSchoolYearPayload,
  SchoolYearSummary,
  StudentFilterParams,
  StudentAdmissionStatus,
  StudentListItem,
  StudentListResponse,
  StudentAdmissionStatusUpdateResult,
  UpdateLevelCapacitiesPayload,
  ReadyEmailApplication,
  ReadyEmailApplicationFilterParams
} from "../types/application";
import type { DashboardStats } from "../types/dashboard";
import type { CsvImportHistoryItem, CsvImportPreview, CsvImportSummary } from "../types/import";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export type AuthUser = {
  role: "admin";
};

export type LoginAdminResponse = {
  token: string;
  user: AuthUser;
};

export type MessageResponse = {
  message: string;
};

type DeleteSchoolYearResult = {
  id: string;
  activatedSchoolYearId: string | null;
};

const buildApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};

const buildQueryString = (
  params: Record<string, string | undefined>
): string => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();

  return queryString.length > 0 ? `?${queryString}` : "";
};

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { message?: unknown };

    if (typeof data.message === "string" && data.message.trim().length > 0) {
      return data.message;
    }
  } catch {
    // Ignore invalid JSON and fall back to the HTTP status.
  }

  return `La requête a échoué (${response.status}).`;
};

export const fetchJson = async <T>(
  path: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const fetchDashboardStats = async (
  init?: RequestInit
): Promise<DashboardStats> => {
  return fetchJson<DashboardStats>("/api/dashboard/stats", init);
};

export const loginAdmin = async (
  email: string,
  password: string,
  init?: RequestInit
): Promise<LoginAdminResponse> => {
  return fetchJson<LoginAdminResponse>("/api/auth/login", {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    body: JSON.stringify({
      email,
      password
    })
  });
};

export const requestPasswordReset = async (
  email: string,
  init?: RequestInit
): Promise<MessageResponse> => {
  return fetchJson<MessageResponse>("/api/auth/forgot-password", {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    body: JSON.stringify({
      email
    })
  });
};

export const resetPassword = async (
  token: string,
  password: string,
  init?: RequestInit
): Promise<MessageResponse> => {
  return fetchJson<MessageResponse>("/api/auth/reset-password", {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    body: JSON.stringify({
      token,
      password
    })
  });
};

export const getApplications = async (
  params: ApplicationFilterParams = {},
  init?: RequestInit
): Promise<ApplicationListItem[]> => {
  const queryString = buildQueryString({
    status: params.status,
    schoolYearId: params.schoolYearId,
    isPriority: params.isPriority,
    search: params.search
  });

  return fetchJson<ApplicationListItem[]>(`/api/applications${queryString}`, init);
};

export const getStudents = async (
  params: StudentFilterParams = {},
  init?: RequestInit
): Promise<StudentListResponse> => {
  const queryString = buildQueryString({
    search: params.search,
    status: params.status,
    levelId: params.levelId,
    schoolYearId: params.schoolYearId,
    isPriority: params.isPriority,
    familyId: params.familyId,
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder
  });

  return fetchJson<StudentListResponse>(`/api/students${queryString}`, init);
};

export const getStudentById = async (
  studentId: string,
  init?: RequestInit
): Promise<StudentListItem> => {
  return fetchJson<StudentListItem>(`/api/students/${encodeURIComponent(studentId)}`, init);
};

export const getLevels = async (init?: RequestInit): Promise<LevelSummary[]> => {
  return fetchJson<LevelSummary[]>("/api/levels", init);
};

export const getApplicationById = async (
  applicationId: string,
  init?: RequestInit
): Promise<ApplicationDetail> => {
  return fetchJson<ApplicationDetail>(
    `/api/applications/${encodeURIComponent(applicationId)}`,
    init
  );
};

export const getApplicationEmailLogs = async (
  applicationId: string,
  init?: RequestInit
): Promise<ApplicationEmailLog[]> => {
  return fetchJson<ApplicationEmailLog[]>(
    `/api/applications/${encodeURIComponent(applicationId)}/email-logs`,
    init
  );
};

export const getReadyEmailApplications = async (
  params: ReadyEmailApplicationFilterParams = {},
  init?: RequestInit
): Promise<ReadyEmailApplication[]> => {
  const queryString = buildQueryString({
    schoolYearId: params.schoolYearId
  });

  return fetchJson<ReadyEmailApplication[]>(
    `/api/applications/ready-for-email${queryString}`,
    init
  );
};

export const sendApplicationEmail = async (
  applicationId: string,
  payload: ApplicationEmailSendPayload,
  init?: RequestInit
): Promise<ApplicationEmailLog> => {
  if (payload.attachments && payload.attachments.length > 0) {
    const formData = new FormData();

    formData.set("emailType", payload.emailType);
    formData.set("subject", payload.subject);
    formData.set("body", payload.body);

    if (payload.syncDecisionAt !== undefined) {
      formData.set("syncDecisionAt", String(payload.syncDecisionAt));
    }

    payload.attachments.forEach((attachment) => {
      formData.append("attachments", attachment, attachment.name);
    });

    return fetchJson<ApplicationEmailLog>(
      `/api/applications/${encodeURIComponent(applicationId)}/send-email`,
      {
        ...init,
        method: "POST",
        body: formData
      }
    );
  }

  return fetchJson<ApplicationEmailLog>(
    `/api/applications/${encodeURIComponent(applicationId)}/send-email`,
    {
      ...init,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      body: JSON.stringify(payload)
    }
  );
};

export const updateApplicationStatus = async (
  applicationId: string,
  status: ApplicationStatus,
  init?: RequestInit
): Promise<ApplicationStatusUpdateResult> => {
  return fetchJson<ApplicationStatusUpdateResult>(
    `/api/applications/${encodeURIComponent(applicationId)}/status`,
    {
      ...init,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      body: JSON.stringify({ status })
    }
  );
};

export const updateApplicationPriority = async (
  applicationId: string,
  isPriority: boolean,
  init?: RequestInit
): Promise<ApplicationPriorityUpdateResult> => {
  return fetchJson<ApplicationPriorityUpdateResult>(
    `/api/applications/${encodeURIComponent(applicationId)}/priority`,
    {
      ...init,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      body: JSON.stringify({ isPriority })
    }
  );
};

export const updateApplicationContactEmail = async (
  applicationId: string,
  contactEmail: string,
  init?: RequestInit
): Promise<ApplicationContactEmailUpdateResult> => {
  return fetchJson<ApplicationContactEmailUpdateResult>(
    `/api/applications/${encodeURIComponent(applicationId)}/contact-email`,
    {
      ...init,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      body: JSON.stringify({ contactEmail })
    }
  );
};

export const updateApplicationDecision = async (
  applicationId: string,
  payload: ApplicationDecisionUpdatePayload,
  init?: RequestInit
): Promise<ApplicationDecisionUpdateResult> => {
  return fetchJson<ApplicationDecisionUpdateResult>(
    `/api/applications/${encodeURIComponent(applicationId)}/decision`,
    {
      ...init,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      body: JSON.stringify(payload)
    }
  );
};

export const updateStudentAdmissionStatus = async (
  studentId: string,
  admissionStatus: StudentAdmissionStatus,
  init?: RequestInit
): Promise<StudentAdmissionStatusUpdateResult> => {
  return fetchJson<StudentAdmissionStatusUpdateResult>(
    `/api/students/${encodeURIComponent(studentId)}/admission-status`,
    {
      ...init,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      body: JSON.stringify({ admissionStatus })
    }
  );
};

export const updateStudentPriority = async (
  studentId: string,
  isPriority: boolean,
  init?: RequestInit
): Promise<StudentListItem> => {
  return fetchJson<StudentListItem>(
    `/api/students/${encodeURIComponent(studentId)}/priority`,
    {
      ...init,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      body: JSON.stringify({ isPriority })
    }
  );
};

export const getSchoolYears = async (
  init?: RequestInit
): Promise<SchoolYearSummary[]> => {
  return fetchJson<SchoolYearSummary[]>("/api/school-years", init);
};

export const getActiveSchoolYear = async (
  init?: RequestInit
): Promise<SchoolYearSummary> => {
  return fetchJson<SchoolYearSummary>("/api/school-years/active", init);
};

export const getSchoolYearLevelCapacities = async (
  schoolYearId: string,
  init?: RequestInit
): Promise<LevelCapacitySummary[]> => {
  return fetchJson<LevelCapacitySummary[]>(
    `/api/school-years/${encodeURIComponent(schoolYearId)}/level-capacities`,
    init
  );
};

export const updateSchoolYearLevelCapacities = async (
  schoolYearId: string,
  payload: UpdateLevelCapacitiesPayload,
  init?: RequestInit
): Promise<LevelCapacitySummary[]> => {
  return fetchJson<LevelCapacitySummary[]>(
    `/api/school-years/${encodeURIComponent(schoolYearId)}/level-capacities`,
    {
      ...init,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      },
      body: JSON.stringify(payload)
    }
  );
};

export const createSchoolYear = async (
  payload: CreateSchoolYearPayload,
  init?: RequestInit
): Promise<SchoolYearSummary> => {
  return fetchJson<SchoolYearSummary>("/api/school-years", {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    body: JSON.stringify(payload)
  });
};

export const activateSchoolYear = async (
  schoolYearId: string,
  init?: RequestInit
): Promise<SchoolYearSummary> => {
  return fetchJson<SchoolYearSummary>(
    `/api/school-years/${encodeURIComponent(schoolYearId)}/activate`,
    {
      ...init,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      }
    }
  );
};

export const deleteSchoolYear = async (
  schoolYearId: string,
  init?: RequestInit
): Promise<DeleteSchoolYearResult> => {
  return fetchJson<DeleteSchoolYearResult>(
    `/api/school-years/${encodeURIComponent(schoolYearId)}`,
    {
      ...init,
      method: "DELETE",
      headers: {
        ...init?.headers
      }
    }
  );
};

const postCsvImportFile = async <TResponse>(
  file: File,
  path: string,
  fields?: Record<string, string>,
  init?: RequestInit
): Promise<TResponse> => {
  const formData = new FormData();

  formData.set("file", file);
  for (const [key, value] of Object.entries(fields ?? {})) {
    formData.set(key, value);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      ...init?.headers
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as TResponse;
};

export const previewCsvImport = async (
  file: File,
  init?: RequestInit
): Promise<CsvImportPreview> => {
  return postCsvImportFile<CsvImportPreview>(file, "/api/import/csv/preview", undefined, init);
};

export const uploadCsvImport = async (
  file: File,
  options?: {
    mergeDuplicateFamilies?: boolean;
  },
  init?: RequestInit
): Promise<CsvImportSummary> => {
  return postCsvImportFile<CsvImportSummary>(
    file,
    "/api/import/csv",
    {
      mergeDuplicateFamilies: String(options?.mergeDuplicateFamilies ?? true)
    },
    init
  );
};

export const getCsvImportHistory = async (
  init?: RequestInit
): Promise<CsvImportHistoryItem[]> => {
  return fetchJson<CsvImportHistoryItem[]>("/api/import/csv/history", init);
};
