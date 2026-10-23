from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repository import get_repository


class FakeRepository:
    """In-memory stand-in for FeatureRequestRepository, mirroring the database defaults."""

    def __init__(self):
        self.rows: dict[str, dict] = {}
        self._clock = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def list(self, sort):
        rows = sorted(self.rows.values(), key=lambda r: r["created_at"], reverse=True)
        if sort == "votes":
            rows = sorted(rows, key=lambda r: r["votes"], reverse=True)
        return rows

    def get(self, request_id: UUID):
        return self.rows.get(str(request_id))

    def create(self, data):
        self._clock += timedelta(seconds=1)
        row = {**data, "id": str(uuid4()), "votes": 0, "status": "Under Review", "created_at": self._clock}
        self.rows[row["id"]] = row
        return row

    def increment_votes(self, request_id: UUID):
        row = self.get(request_id)
        if row:
            row["votes"] += 1
        return row

    def update_status(self, request_id: UUID, from_status, to_status):
        row = self.get(request_id)
        if row and row["status"] == from_status:
            row["status"] = to_status
            return row
        return None

    def delete(self, request_id: UUID):
        return self.rows.pop(str(request_id), None) is not None


@pytest.fixture
def client():
    repo = FakeRepository()
    app.dependency_overrides[get_repository] = lambda: repo
    yield TestClient(app)
    app.dependency_overrides.clear()


def create(client, **overrides):
    body = {"title": "Dark mode", "category": "UI", **overrides}
    res = client.post("/api/requests", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def test_create_defaults(client):
    row = create(client, description="  Please  ")
    assert row["votes"] == 0
    assert row["status"] == "Under Review"
    assert row["description"] == "Please"


def test_create_blank_description_becomes_null(client):
    assert create(client, description="   ")["description"] is None


@pytest.mark.parametrize(
    "body",
    [
        {"title": "", "category": "UI"},
        {"title": "   ", "category": "UI"},
        {"title": "x" * 121, "category": "UI"},
        {"title": "ok", "category": "Security"},
        {"category": "UI"},
    ],
)
def test_create_validation(client, body):
    assert client.post("/api/requests", json=body).status_code == 422


def test_title_max_length_allowed(client):
    create(client, title="x" * 120)


def test_list_sorting(client):
    a = create(client, title="A")
    b = create(client, title="B")
    c = create(client, title="C")
    for _ in range(2):
        client.post(f"/api/requests/{a['id']}/upvote")
    client.post(f"/api/requests/{b['id']}/upvote")

    by_votes = [r["title"] for r in client.get("/api/requests?sort=votes").json()]
    newest = [r["title"] for r in client.get("/api/requests?sort=newest").json()]
    assert by_votes == ["A", "B", "C"]
    assert newest == ["C", "B", "A"]
    assert client.get("/api/requests?sort=bogus").status_code == 422
    assert c  # created


def test_upvote_increments(client):
    row = create(client)
    for expected in (1, 2, 3):
        assert client.post(f"/api/requests/{row['id']}/upvote").json()["votes"] == expected


def test_upvote_missing(client):
    assert client.post(f"/api/requests/{uuid4()}/upvote").status_code == 404
    assert client.post("/api/requests/not-a-uuid/upvote").status_code == 422


def test_status_advances_in_order(client):
    row = create(client)
    url = f"/api/requests/{row['id']}/status"
    for status in ("Planned", "In Progress", "Done"):
        res = client.patch(url, json={"status": status})
        assert res.status_code == 200, res.text
        assert res.json()["status"] == status


@pytest.mark.parametrize("target", ["In Progress", "Done", "Under Review"])
def test_status_cannot_skip_or_go_back(client, target):
    row = create(client)
    assert client.patch(f"/api/requests/{row['id']}/status", json={"status": target}).status_code == 409


def test_status_invalid_and_missing(client):
    row = create(client)
    assert client.patch(f"/api/requests/{row['id']}/status", json={"status": "Shipped"}).status_code == 422
    assert client.patch(f"/api/requests/{uuid4()}/status", json={"status": "Planned"}).status_code == 404


def test_delete(client):
    row = create(client)
    assert client.delete(f"/api/requests/{row['id']}").status_code == 204
    assert client.get("/api/requests").json() == []
    assert client.delete(f"/api/requests/{row['id']}").status_code == 404
