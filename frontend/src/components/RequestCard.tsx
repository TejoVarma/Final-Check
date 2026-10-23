import { nextStatus, type FeatureRequest } from "../types";

interface Props {
  request: FeatureRequest;
  onUpvote: (id: string) => void;
  onAdvance: (request: FeatureRequest) => void;
  onDelete: (request: FeatureRequest) => void;
}

const statusClass = (status: string) => "status status-" + status.toLowerCase().replace(" ", "-");

export default function RequestCard({ request, onUpvote, onAdvance, onDelete }: Props) {
  const next = nextStatus(request.status);

  return (
    <li className="card request">
      <button className="vote" onClick={() => onUpvote(request.id)} aria-label={`Upvote ${request.title}`}>
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
          {next && <button onClick={() => onAdvance(request)}>Move to {next}</button>}
          <button className="danger" onClick={() => onDelete(request)}>
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
