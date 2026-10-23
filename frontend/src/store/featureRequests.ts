import { create } from "zustand";
import { api } from "../api";
import { compareRequests, nextStatus, type FeatureRequest, type NewFeatureRequest, type SortOption } from "../types";

interface FeatureRequestState {
  requests: FeatureRequest[];
  sort: SortOption;
  loading: boolean;
  error: string | null;

  fetchRequests: () => Promise<void>;
  setSort: (sort: SortOption) => void;
  createRequest: (body: NewFeatureRequest) => Promise<boolean>;
  upvote: (id: string) => Promise<void>;
  advanceStatus: (request: FeatureRequest) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  clearError: () => void;
}

// Ignores list responses that arrive after a newer fetch was started (e.g. quick sort toggling).
let latestFetch = 0;

export const useFeatureRequests = create<FeatureRequestState>()((set, get) => {
  const upsert = (row: FeatureRequest) =>
    set((state) => ({
      requests: [row, ...state.requests.filter((r) => r.id !== row.id)].sort(compareRequests(state.sort)),
    }));

  async function run(action: () => Promise<void>): Promise<boolean> {
    try {
      await action();
      set({ error: null });
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  }

  return {
    requests: [],
    sort: "votes",
    loading: true,
    error: null,

    fetchRequests: async () => {
      const fetchId = ++latestFetch;
      set({ loading: true });
      try {
        const requests = await api.list(get().sort);
        if (fetchId === latestFetch) set({ requests, error: null });
      } catch (e) {
        if (fetchId === latestFetch) set({ error: (e as Error).message });
      } finally {
        if (fetchId === latestFetch) set({ loading: false });
      }
    },

    setSort: (sort) => {
      if (sort === get().sort) return;
      set({ sort });
      void get().fetchRequests();
    },

    createRequest: (body) => run(async () => upsert(await api.create(body))),

    upvote: async (id) => {
      await run(async () => upsert(await api.upvote(id)));
    },

    advanceStatus: async (request) => {
      const next = nextStatus(request.status);
      if (!next) return;
      await run(async () => upsert(await api.setStatus(request.id, next)));
    },

    deleteRequest: async (id) => {
      await run(async () => {
        await api.remove(id);
        set((state) => ({ requests: state.requests.filter((r) => r.id !== id) }));
      });
    },

    clearError: () => set({ error: null }),
  };
});
