import { useEffect } from "react";
import RequestCard from "./components/RequestCard";
import RequestForm from "./components/RequestForm";
import { useFeatureRequests } from "./store/featureRequests";

export default function App() {
  const requests = useFeatureRequests((s) => s.requests);
  const sort = useFeatureRequests((s) => s.sort);
  const loading = useFeatureRequests((s) => s.loading);
  const error = useFeatureRequests((s) => s.error);
  const fetchRequests = useFeatureRequests((s) => s.fetchRequests);
  const setSort = useFeatureRequests((s) => s.setSort);
  const clearError = useFeatureRequests((s) => s.clearError);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  return (
    <main className="container">
      <header>
        <h1>Feature Requests</h1>
        <p className="muted">Suggest what we should build next and vote on the ideas you want most.</p>
      </header>

      <RequestForm />

      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={clearError} aria-label="Dismiss">×</button>
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
              <RequestCard key={r.id} request={r} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
