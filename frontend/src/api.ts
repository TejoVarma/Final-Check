import type { FeatureRequest, NewFeatureRequest, SortOption, Status } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Same-origin: Vite proxies /api in dev, an Amplify rewrite proxies it in production.
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  list: (sort: SortOption) => request<FeatureRequest[]>(`/api/requests?sort=${sort}`),
  create: (body: NewFeatureRequest) =>
    request<FeatureRequest>("/api/requests", { method: "POST", body: JSON.stringify(body) }),
  upvote: (id: string) => request<FeatureRequest>(`/api/requests/${id}/upvote`, { method: "POST" }),
  setStatus: (id: string, status: Status) =>
    request<FeatureRequest>(`/api/requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  remove: (id: string) => request<void>(`/api/requests/${id}`, { method: "DELETE" }),
};
