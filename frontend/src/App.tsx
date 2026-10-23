import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import RequestCard from "./components/RequestCard";
import RequestForm from "./components/RequestForm";
import { compareRequests, nextStatus, type FeatureRequest, type NewFeatureRequest, type SortOption } from "./types";

export default function App() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [sort, setSort] = useState<SortOption>("votes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .list(sort)
      .then((rows) => {
        setRequests(rows);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sort]);

  const upsert = useCallback(
    (row: FeatureRequest) =>
      setRequests((prev) => [row, ...prev.filter((r) => r.id !== row.id)].sort(compareRequests(sort))),
    [sort],
  );

  async function run(action: () => Promise<void>) {
    try {
      await action();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const handleCreate = (body: NewFeatureRequest) => run(async () => upsert(await api.create(body)));

  const handleUpvote = (id: string) => run(async () => upsert(await api.upvote(id)));

  const handleAdvance = (request: FeatureRequest) =>
    run(async () => {
      const next = nextStatus(request.status);
      if (next) upsert(await api.setStatus(request.id, next));
    });

  const handleDelete = (request: FeatureRequest) => {
    if (!window.confirm(`Delete "${request.title}"?`)) return;
    return run(async () => {
      await api.remove(request.id);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    });
  };

  return (
    <main className="container">
      <header>
        <h1>Feature Requests</h1>
        <p className="muted">Suggest what we should build next and vote on the ideas you want most.</p>
      </header>

      <RequestForm onSubmit={handleCreate} />

      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <section>
        <div className="list-header">
          <h2>All requests {!loading && <span className="muted">({requests.length})</span>}</h2>
          <div className="segmented" role="group" aria-label="Sort by">
            <button aria-pressed={sort === "votes"} onClick={() => setSort("votes")}>
              Most votes
            </button>
            <button aria-pressed={sort === "newest"} onClick={() => setSort("newest")}>
              Newest
            </button>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="muted empty">No requests yet. Be the first to suggest one.</p>
        ) : (
          <ul className="list">
            {requests.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                onUpvote={handleUpvote}
                onAdvance={handleAdvance}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
