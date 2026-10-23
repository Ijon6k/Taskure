import { apiClient } from "../client";

export interface ProviderConfig {
  id: string;
  provider: string;
  endpoint?: string;
  model: string;
  config?: Record<string, unknown>;
  is_default: boolean;
}

export interface CreateProviderRequest {
  provider: string;
  api_key: string;
  endpoint?: string;
  model: string;
  config?: Record<string, unknown>;
  is_default?: boolean;
}

export const providersService = {
  list: () =>
    apiClient
      .get<ProviderConfig[]>("/providers")
      .then((r) => r.data),

  create: (data: CreateProviderRequest) => apiClient.post("/providers", data),

  update: (id: string, data: Partial<CreateProviderRequest>) =>
    apiClient.put(`/providers/${id}`, data),

  delete: (id: string) => apiClient.delete(`/providers/${id}`),

  test: (id: string) => apiClient.post(`/providers/${id}/test`),
};
