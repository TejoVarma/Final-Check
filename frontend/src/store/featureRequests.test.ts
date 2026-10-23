import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeatureRequest } from "../types";
import { useFeatureRequests } from "./featureRequests";

const row = (id: string, votes: number, created_at: string, extra: Partial<FeatureRequest> = {}): FeatureRequest => ({
  id,
  title: id,
  description: null,
  category: "UI",
  votes,
  status: "Under Review",
  created_at,
  ...extra,
});

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status }));

const fetchMock = vi.fn<typeof fetch>();
const store = () => useFeatureRequests.getState();

beforeEach(() => {
  useFeatureRequests.setState(useFeatureRequests.getInitialState(), true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("feature request store", () => {
  it("loads requests sorted by votes by default", async () => {
    fetchMock.mockReturnValueOnce(json([row("a", 2, "2026-01-01")]));
    await store().fetchRequests();
    expect(fetchMock).toHaveBeenCalledWith("/api/requests?sort=votes", expect.anything());
    expect(store().requests.map((r) => r.id)).toEqual(["a"]);
    expect(store().loading).toBe(false);
  });

  it("refetches when the sort changes", async () => {
    fetchMock.mockReturnValue(json([]));
    store().setSort("newest");
    await vi.waitFor(() => expect(store().loading).toBe(false));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/requests?sort=newest", expect.anything());
  });

  it("ignores a slow list response that finishes after a newer one", async () => {
    let resolveSlow!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise((r) => (resolveSlow = r)))
      .mockReturnValueOnce(json([row("newest-result", 0, "2026-01-02")]));
    const slow = store().fetchRequests();
    store().setSort("newest");
    await vi.waitFor(() => expect(store().requests[0]?.id).toBe("newest-result"));
    resolveSlow(new Response(JSON.stringify([row("stale", 9, "2026-01-01")])));
    await slow;
    expect(store().requests.map((r) => r.id)).toEqual(["newest-result"]);
  });

  it("moves an upvoted request up when sorted by votes", async () => {
    useFeatureRequests.setState({ requests: [row("a", 2, "2026-01-01"), row("b", 2, "2026-01-01")] });
    fetchMock.mockReturnValueOnce(json(row("b", 3, "2026-01-01")));
    await store().upvote("b");
    expect(store().requests.map((r) => [r.id, r.votes])).toEqual([["b", 3], ["a", 2]]);
  });

  it("advances status to the next step", async () => {
    useFeatureRequests.setState({ requests: [row("a", 0, "2026-01-01")] });
    fetchMock.mockReturnValueOnce(json(row("a", 0, "2026-01-01", { status: "Planned" })));
    await store().advanceStatus(store().requests[0]);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toBe(JSON.stringify({ status: "Planned" }));
    expect(store().requests[0].status).toBe("Planned");
  });

  it("does nothing when the request is already Done", async () => {
    await store().advanceStatus(row("a", 0, "2026-01-01", { status: "Done" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a request and reports success", async () => {
    fetchMock.mockReturnValueOnce(json(row("new", 0, "2026-01-03")));
    expect(await store().createRequest({ title: "new", description: null, category: "UI" })).toBe(true);
    expect(store().requests.map((r) => r.id)).toEqual(["new"]);
  });

  it("surfaces the API error message and reports failure", async () => {
    fetchMock.mockReturnValueOnce(json({ detail: "Cannot move from Under Review to Done" }, 409));
    expect(await store().createRequest({ title: "x", description: null, category: "UI" })).toBe(false);
    expect(store().error).toBe("Cannot move from Under Review to Done");
  });

  it("removes a deleted request", async () => {
    useFeatureRequests.setState({ requests: [row("a", 0, "2026-01-01"), row("b", 0, "2026-01-01")] });
    fetchMock.mockReturnValueOnce(json(null, 204));
    await store().deleteRequest("a");
    expect(store().requests.map((r) => r.id)).toEqual(["b"]);
  });
});
