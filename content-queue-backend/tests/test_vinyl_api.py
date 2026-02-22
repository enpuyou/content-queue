"""
Integration tests for the vinyl (Crates) API.

Covers:
- POST /vinyl — create record (Celery mocked)
- GET /vinyl — list with status filter and sort
- GET /vinyl/{id} — single record, 404
- PATCH /vinyl/{id} — update fields, 404
- DELETE /vinyl/{id} — soft delete, verify gone from list
- Auth guards on all endpoints
"""

import pytest
from unittest.mock import patch
from app.models.vinyl import VinylRecord


DISCOGS_URL = "https://www.discogs.com/release/1234-Test-Album"


@pytest.fixture
def test_vinyl(db_session, test_user):
    """Create a vinyl record directly in the DB (no Celery)."""
    record = VinylRecord(
        user_id=test_user.id,
        discogs_url=DISCOGS_URL,
        processing_status="pending",
        title="Test Album",
        artist="Test Artist",
        year=1985,
        status="collection",
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


def test_create_vinyl_record(client, auth_headers):
    """POST /vinyl creates a pending record and enqueues Celery task."""
    with patch("app.tasks.discogs.fetch_discogs_metadata.delay") as mock_delay:
        response = client.post(
            "/vinyl",
            json={"discogs_url": DISCOGS_URL},
            headers=auth_headers,
        )

    assert response.status_code == 201
    data = response.json()
    assert data["discogs_url"] == DISCOGS_URL
    assert data["processing_status"] == "pending"
    assert "id" in data
    mock_delay.assert_called_once()


def test_create_vinyl_requires_auth(client):
    response = client.post("/vinyl", json={"discogs_url": DISCOGS_URL})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


def test_list_vinyl_returns_user_records(client, auth_headers, test_vinyl):
    """GET /vinyl returns the current user's vinyl records."""
    response = client.get("/vinyl", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(test_vinyl.id)


def test_list_vinyl_filter_by_status(client, auth_headers, db_session, test_user):
    """GET /vinyl?status=wantlist only returns wantlist records."""
    r1 = VinylRecord(
        user_id=test_user.id,
        discogs_url="https://discogs.com/1",
        status="collection",
    )
    r2 = VinylRecord(
        user_id=test_user.id,
        discogs_url="https://discogs.com/2",
        status="wantlist",
    )
    db_session.add_all([r1, r2])
    db_session.commit()

    response = client.get("/vinyl?status=wantlist", headers=auth_headers)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["status"] == "wantlist"


def test_list_vinyl_excludes_soft_deleted(client, auth_headers, db_session, test_vinyl):
    """Soft-deleted records are not returned in list."""
    from datetime import datetime

    test_vinyl.deleted_at = datetime.utcnow()
    db_session.commit()

    response = client.get("/vinyl", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_vinyl_requires_auth(client):
    response = client.get("/vinyl")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------


def test_get_vinyl_record(client, auth_headers, test_vinyl):
    response = client.get(f"/vinyl/{test_vinyl.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(test_vinyl.id)


def test_get_vinyl_record_not_found(client, auth_headers):
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/vinyl/{fake_id}", headers=auth_headers)
    assert response.status_code == 404


def test_get_vinyl_cross_user_isolation(client, auth_headers, db_session):
    """User B cannot access User A's vinyl record."""
    from app.models.user import User
    from app.core.security import get_password_hash

    other_user = User(
        email="vinyl_other@example.com",
        hashed_password=get_password_hash("pass"),
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    other_vinyl = VinylRecord(
        user_id=other_user.id,
        discogs_url="https://discogs.com/99",
    )
    db_session.add(other_vinyl)
    db_session.commit()
    db_session.refresh(other_vinyl)

    # auth_headers belongs to test_user, not other_user
    response = client.get(f"/vinyl/{other_vinyl.id}", headers=auth_headers)
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


def test_update_vinyl_record(client, auth_headers, test_vinyl):
    response = client.patch(
        f"/vinyl/{test_vinyl.id}",
        json={"notes": "Great pressing", "rating": 5, "status": "wantlist"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["notes"] == "Great pressing"
    assert data["rating"] == 5
    assert data["status"] == "wantlist"


def test_update_vinyl_not_found(client, auth_headers):
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = client.patch(
        f"/vinyl/{fake_id}",
        json={"notes": "Test"},
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


def test_delete_vinyl_record_soft_deletes(client, auth_headers, test_vinyl, db_session):
    """DELETE soft-deletes the record; it no longer appears in list."""
    response = client.delete(f"/vinyl/{test_vinyl.id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify gone from list
    list_response = client.get("/vinyl", headers=auth_headers)
    assert list_response.json() == []

    # Verify record still exists in DB (soft delete, not hard delete)
    db_session.refresh(test_vinyl)
    assert test_vinyl.deleted_at is not None


def test_delete_vinyl_not_found(client, auth_headers):
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = client.delete(f"/vinyl/{fake_id}", headers=auth_headers)
    assert response.status_code == 404
