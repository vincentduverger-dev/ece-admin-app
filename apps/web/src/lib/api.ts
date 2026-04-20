import type {
  ApplicationDecisionUpdatePayload,
  ApplicationDecisionUpdateResult,
  ApplicationDetail,
  ApplicationFilterParams,
  ApplicationEmailLog,
  ApplicationListItem,
  ApplicationPriorityUpdateResult,
  ApplicationStatus,
  ApplicationStatusUpdateResult,
  SchoolYearSummary
} from "../types/application";
import type { DashboardStats } from "../types/dashboard";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

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

export const getSchoolYears = async (
  init?: RequestInit
): Promise<SchoolYearSummary[]> => {
  return fetchJson<SchoolYearSummary[]>("/api/school-years", init);
};
