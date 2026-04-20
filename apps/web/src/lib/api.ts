import type { DashboardStats } from "../types/dashboard";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const buildApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
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
