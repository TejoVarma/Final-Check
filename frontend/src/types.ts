export const CATEGORIES = ["UI", "Performance", "Integration", "Other"] as const;
export const STATUS_FLOW = ["Under Review", "Planned", "In Progress", "Done"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Status = (typeof STATUS_FLOW)[number];
export type SortOption = "votes" | "newest";

export const TITLE_MAX = 120;

export interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  votes: number;
  status: Status;
  created_at: string;
}

export interface NewFeatureRequest {
  title: string;
  description: string | null;
  category: Category;
}

export function nextStatus(status: Status): Status | null {
  const i = STATUS_FLOW.indexOf(status);
  return i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

// Mirrors the backend ordering so local updates stay consistent with a fresh fetch.
export function compareRequests(sort: SortOption) {
  return (a: FeatureRequest, b: FeatureRequest) =>
    (sort === "votes" ? b.votes - a.votes : 0) || b.created_at.localeCompare(a.created_at);
}
