from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, StringConstraints, field_validator

Category = Literal["UI", "Performance", "Integration", "Other"]
Status = Literal["Under Review", "Planned", "In Progress", "Done"]
SortOption = Literal["votes", "newest"]

STATUS_FLOW: list[Status] = ["Under Review", "Planned", "In Progress", "Done"]


class FeatureRequestCreate(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    description: str | None = None
    category: Category

    @field_validator("description")
    @classmethod
    def blank_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class StatusUpdate(BaseModel):
    status: Status


class FeatureRequest(BaseModel):
    id: UUID
    title: str
    description: str | None
    category: Category
    votes: int
    status: Status
    created_at: datetime
