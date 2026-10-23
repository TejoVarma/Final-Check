import { useFeatureRequests } from "../store/featureRequests";
import { nextStatus, type FeatureRequest } from "../types";

interface Props {
  request: FeatureRequest;
}

const statusClass = (status: string) => "status status-" + status.toLowerCase().replace(" ", "-");

export default function RequestCard({ request }: Props) {
  const upvote = useFeatureRequests((s) => s.upvote);
  const advanceStatus = useFeatureRequests((s) => s.advanceStatus);
  const deleteRequest = useFeatureRequests((s) => s.deleteRequest);
  const next = nextStatus(request.status);

  function handleDelete() {
    if (window.confirm(`Delete "${request.title}"?`)) void deleteRequest(request.id);
  }

  return (
    <li className="card request">
      <button className="vote" onClick={() => upvote(request.id)} aria-label={`Upvote ${request.title}`}>
        <span aria-hidden>▲</span>
        <strong>{request.votes}</strong>
      </button>

      <div className="request-body">
        <div className="request-meta">
          <span className="tag">{request.category}</span>
          <span className={statusClass(request.status)}>{request.status}</span>
          <time className="muted" dateTime={request.created_at}>
            {new Date(request.created_at).toLocaleDateString()}
          </time>
        </div>
        <h3>{request.title}</h3>
        {request.description && <p>{request.description}</p>}

        <div className="request-actions">
          {next && <button onClick={() => advanceStatus(request)}>Move to {next}</button>}
          <button className="danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
