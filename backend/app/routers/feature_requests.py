from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.repository import FeatureRequestRepository, get_repository
from app.schemas import STATUS_FLOW, FeatureRequest, FeatureRequestCreate, SortOption, StatusUpdate

router = APIRouter(prefix="/requests", tags=["feature requests"])


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, "Feature request not found")


@router.get("", response_model=list[FeatureRequest])
def list_requests(
    sort: SortOption = Query("votes"),
    repo: FeatureRequestRepository = Depends(get_repository),
):
    return repo.list(sort)


@router.post("", response_model=FeatureRequest, status_code=status.HTTP_201_CREATED)
def create_request(body: FeatureRequestCreate, repo: FeatureRequestRepository = Depends(get_repository)):
    # votes and status come from the database defaults (0, "Under Review")
    return repo.create(body.model_dump())


@router.post("/{request_id}/upvote", response_model=FeatureRequest)
def upvote_request(request_id: UUID, repo: FeatureRequestRepository = Depends(get_repository)):
    row = repo.increment_votes(request_id)
    if row is None:
        raise _not_found()
    return row


@router.patch("/{request_id}/status", response_model=FeatureRequest)
def update_status(
    request_id: UUID,
    body: StatusUpdate,
    repo: FeatureRequestRepository = Depends(get_repository),
):
    target_index = STATUS_FLOW.index(body.status)
    if target_index == 0:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Status cannot be moved back to {body.status}")

    previous = STATUS_FLOW[target_index - 1]
    row = repo.update_status(request_id, previous, body.status)
    if row is None:
        current = repo.get(request_id)
        if current is None:
            raise _not_found()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot move from {current['status']} to {body.status}; status must advance one step at a time",
        )
    return row


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(request_id: UUID, repo: FeatureRequestRepository = Depends(get_repository)):
    if not repo.delete(request_id):
        raise _not_found()
