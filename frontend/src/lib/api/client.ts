import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const API_BASE_URL = "/api";

export class ApiError extends Error {
  status?: number | undefined;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message =
      getApiErrorMessage(data) ||
      error.response?.statusText ||
      error.message ||
      "API request failed";

    return Promise.reject(new ApiError(message, status, data));
  }
);

function getApiErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const payload = data as { message?: unknown; error?: unknown };
  if (typeof payload.error === "string") return payload.error;
  if (typeof payload.message === "string") return payload.message;
  return undefined;
}

export async function fetcher<T>(
  endpoint: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.request<T>({
    url: endpoint,
    ...config,
  });
  return response.data;
}
