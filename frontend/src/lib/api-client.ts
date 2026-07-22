// Base API client — points to nginx reverse proxy or direct Go API
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Params = Record<string, string | number | boolean>;

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { params?: Params } = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      );
      url += `?${searchParams}`;
    }

    const res = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers ?? {}),
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async get<T>(endpoint: string, params?: Params): Promise<T> {
    const opts: RequestInit & { params?: Params } = { method: "GET" };
    if (params) opts.params = params;
    return this.request<T>(endpoint, opts);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const opts: RequestInit & { params?: Params } = { method: "POST" };
    if (data) opts.body = JSON.stringify(data);
    return this.request<T>(endpoint, opts);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const opts: RequestInit & { params?: Params } = { method: "PUT" };
    if (data) opts.body = JSON.stringify(data);
    return this.request<T>(endpoint, opts);
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const opts: RequestInit & { params?: Params } = { method: "PATCH" };
    if (data) opts.body = JSON.stringify(data);
    return this.request<T>(endpoint, opts);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE);
