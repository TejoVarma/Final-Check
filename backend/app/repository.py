from typing import Any
from uuid import UUID

from supabase import Client

from app.db import get_supabase
from app.schemas import SortOption, Status

TABLE = "feature_requests"
Row = dict[str, Any]


class FeatureRequestRepository:
    def __init__(self, client: Client):
        self.client = client

    def list(self, sort: SortOption) -> list[Row]:
        query = self.client.table(TABLE).select("*")
        if sort == "votes":
            query = query.order("votes", desc=True)
        return query.order("created_at", desc=True).execute().data

    def get(self, request_id: UUID) -> Row | None:
        rows = self.client.table(TABLE).select("*").eq("id", str(request_id)).limit(1).execute().data
        return rows[0] if rows else None

    def create(self, data: Row) -> Row:
        return self.client.table(TABLE).insert(data).execute().data[0]

    def increment_votes(self, request_id: UUID) -> Row | None:
        rows = self.client.rpc("increment_votes", {"request_id": str(request_id)}).execute().data
        return rows[0] if rows else None

    def update_status(self, request_id: UUID, from_status: Status, to_status: Status) -> Row | None:
        """Only updates if the current status is still `from_status`, so concurrent changes can't skip steps."""
        rows = (
            self.client.table(TABLE)
            .update({"status": to_status})
            .eq("id", str(request_id))
            .eq("status", from_status)
            .execute()
            .data
        )
        return rows[0] if rows else None

    def delete(self, request_id: UUID) -> bool:
        return bool(self.client.table(TABLE).delete().eq("id", str(request_id)).execute().data)


def get_repository() -> FeatureRequestRepository:
    return FeatureRequestRepository(get_supabase())
