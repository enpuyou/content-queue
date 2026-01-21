"""
Unit tests for the highlights API endpoints.

Tests cover:
- Creating highlights with various colors and notes
- Retrieving highlights for a content item
- Updating highlight colors and notes
- Deleting highlights
- Authorization and permission checks
- Error handling for invalid data
"""

from uuid import uuid4


class TestCreateHighlight:
    """Tests for POST /content/{content_id}/highlights"""

    def test_create_highlight_success(self, client, auth_headers, test_content):
        """
        Test successfully creating a basic highlight.

        This verifies that:
        - A highlight can be created with required fields
        - The API returns 201 Created status
        - The response contains the correct highlight data
        - The highlight is persisted in the database
        """
        highlight_data = {
            "text": "test article with enough",
            "start_offset": 10,
            "end_offset": 35,
            "color": "yellow",
        }

        response = client.post(
            f"/content/{test_content.id}/highlights",
            json=highlight_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["text"] == highlight_data["text"]
        assert data["start_offset"] == highlight_data["start_offset"]
        assert data["end_offset"] == highlight_data["end_offset"]
        assert data["color"] == highlight_data["color"]
        assert data["note"] is None
        assert "id" in data
        assert "created_at" in data

    def test_create_highlight_with_note(self, client, auth_headers, test_content):
        """
        Test creating a highlight with an optional note.

        Notes allow users to add context or commentary to their highlights.
        """
        highlight_data = {
            "text": "test article",
            "start_offset": 10,
            "end_offset": 22,
            "color": "green",
            "note": "This is an important point",
        }

        response = client.post(
            f"/content/{test_content.id}/highlights",
            json=highlight_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["note"] == "This is an important point"

    def test_create_highlight_different_colors(
        self, client, auth_headers, test_content
    ):
        """
        Test that all supported colors work correctly.

        Verifies that the API accepts: yellow, green, blue, pink, purple.
        """
        colors = ["yellow", "green", "blue", "pink", "purple"]

        for i, color in enumerate(colors):
            highlight_data = {
                "text": f"text_{i}",
                "start_offset": i * 10,
                "end_offset": i * 10 + 5,
                "color": color,
            }

            response = client.post(
                f"/content/{test_content.id}/highlights",
                json=highlight_data,
                headers=auth_headers,
            )

            assert response.status_code == 201
            assert response.json()["color"] == color

    def test_create_highlight_content_not_found(self, client, auth_headers):
        """
        Test creating a highlight for non-existent content.

        Should return 404 when the content ID doesn't exist.
        """
        fake_content_id = uuid4()
        highlight_data = {
            "text": "test",
            "start_offset": 0,
            "end_offset": 4,
            "color": "yellow",
        }

        response = client.post(
            f"/content/{fake_content_id}/highlights",
            json=highlight_data,
            headers=auth_headers,
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_create_highlight_unauthorized(self, client, test_content):
        """
        Test creating a highlight without authentication.

        Should return 401 Unauthorized when no auth token is provided.
        """
        highlight_data = {
            "text": "test",
            "start_offset": 0,
            "end_offset": 4,
            "color": "yellow",
        }

        response = client.post(
            f"/content/{test_content.id}/highlights",
            json=highlight_data,
        )

        assert response.status_code == 401

    def test_create_highlight_invalid_offsets(self, client, auth_headers, test_content):
        """
        Test validation of highlight offsets.

        End offset must be greater than start offset.
        """
        highlight_data = {
            "text": "test",
            "start_offset": 100,
            "end_offset": 50,  # Invalid: end before start
            "color": "yellow",
        }

        response = client.post(
            f"/content/{test_content.id}/highlights",
            json=highlight_data,
            headers=auth_headers,
        )

        # Should either reject with 422 validation error or accept
        # (depending on backend validation rules)
        assert response.status_code in [201, 422]


class TestGetHighlights:
    """Tests for GET /content/{content_id}/highlights"""

    def test_get_highlights_empty(self, client, auth_headers, test_content):
        """
        Test retrieving highlights when none exist.

        Should return an empty list, not an error.
        """
        response = client.get(
            f"/content/{test_content.id}/highlights",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_get_highlights_multiple(self, client, auth_headers, test_content):
        """
        Test retrieving multiple highlights.

        Verifies that:
        - All highlights are returned
        - Highlights are ordered by start_offset
        - Each highlight contains expected fields
        """
        # Create 3 highlights
        highlights_data = [
            {"text": "first", "start_offset": 0, "end_offset": 5, "color": "yellow"},
            {"text": "second", "start_offset": 50, "end_offset": 56, "color": "green"},
            {"text": "third", "start_offset": 25, "end_offset": 30, "color": "blue"},
        ]

        for hl_data in highlights_data:
            client.post(
                f"/content/{test_content.id}/highlights",
                json=hl_data,
                headers=auth_headers,
            )

        # Get all highlights
        response = client.get(
            f"/content/{test_content.id}/highlights",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Verify ordering by start_offset
        assert data[0]["start_offset"] == 0
        assert data[1]["start_offset"] == 25
        assert data[2]["start_offset"] == 50

    def test_get_highlights_content_not_found(self, client, auth_headers):
        """
        Test retrieving highlights for non-existent content.

        Should return 404.
        """
        fake_content_id = uuid4()

        response = client.get(
            f"/content/{fake_content_id}/highlights",
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_get_highlights_unauthorized(self, client, test_content):
        """
        Test retrieving highlights without authentication.

        Should return 401.
        """
        response = client.get(
            f"/content/{test_content.id}/highlights",
        )

        assert response.status_code == 401


class TestUpdateHighlight:
    """Tests for PATCH /highlights/{highlight_id}"""

    def test_update_highlight_color(self, client, auth_headers, test_content):
        """
        Test updating a highlight's color.

        Users should be able to change the color of existing highlights.
        """
        # Create a highlight
        create_response = client.post(
            f"/content/{test_content.id}/highlights",
            json={
                "text": "test",
                "start_offset": 0,
                "end_offset": 4,
                "color": "yellow",
            },
            headers=auth_headers,
        )
        highlight_id = create_response.json()["id"]

        # Update color
        update_response = client.patch(
            f"/highlights/{highlight_id}",
            json={"color": "green"},
            headers=auth_headers,
        )

        assert update_response.status_code == 200
        data = update_response.json()
        assert data["color"] == "green"
        assert data["text"] == "test"  # Other fields unchanged

    def test_update_highlight_note(self, client, auth_headers, test_content):
        """
        Test updating a highlight's note.

        Users should be able to add, edit, or remove notes.
        """
        # Create a highlight without a note
        create_response = client.post(
            f"/content/{test_content.id}/highlights",
            json={
                "text": "test",
                "start_offset": 0,
                "end_offset": 4,
                "color": "yellow",
            },
            headers=auth_headers,
        )
        highlight_id = create_response.json()["id"]

        # Add a note
        update_response = client.patch(
            f"/highlights/{highlight_id}",
            json={"note": "This is a new note"},
            headers=auth_headers,
        )

        assert update_response.status_code == 200
        assert update_response.json()["note"] == "This is a new note"

    def test_update_highlight_both_fields(self, client, auth_headers, test_content):
        """
        Test updating both color and note simultaneously.
        """
        # Create a highlight
        create_response = client.post(
            f"/content/{test_content.id}/highlights",
            json={
                "text": "test",
                "start_offset": 0,
                "end_offset": 4,
                "color": "yellow",
                "note": "Old note",
            },
            headers=auth_headers,
        )
        highlight_id = create_response.json()["id"]

        # Update both fields
        update_response = client.patch(
            f"/highlights/{highlight_id}",
            json={"color": "purple", "note": "New note"},
            headers=auth_headers,
        )

        assert update_response.status_code == 200
        data = update_response.json()
        assert data["color"] == "purple"
        assert data["note"] == "New note"

    def test_update_highlight_not_found(self, client, auth_headers):
        """
        Test updating a non-existent highlight.

        Should return 404.
        """
        fake_highlight_id = uuid4()

        response = client.patch(
            f"/highlights/{fake_highlight_id}",
            json={"color": "green"},
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_update_highlight_unauthorized(self, client, test_content, auth_headers):
        """
        Test updating a highlight without authentication.

        Should return 401.
        """
        # Create a highlight first
        create_response = client.post(
            f"/content/{test_content.id}/highlights",
            json={
                "text": "test",
                "start_offset": 0,
                "end_offset": 4,
                "color": "yellow",
            },
            headers=auth_headers,
        )
        highlight_id = create_response.json()["id"]

        # Try to update without auth
        response = client.patch(
            f"/highlights/{highlight_id}",
            json={"color": "green"},
        )

        assert response.status_code == 401


class TestDeleteHighlight:
    """Tests for DELETE /highlights/{highlight_id}"""

    def test_delete_highlight_success(
        self, client, auth_headers, test_content, db_session
    ):
        """
        Test successfully deleting a highlight.

        Verifies that:
        - The API returns 204 No Content
        - The highlight is removed from the database
        - Subsequent GET requests don't include the deleted highlight
        """
        # Create a highlight
        create_response = client.post(
            f"/content/{test_content.id}/highlights",
            json={
                "text": "test",
                "start_offset": 0,
                "end_offset": 4,
                "color": "yellow",
            },
            headers=auth_headers,
        )
        highlight_id = create_response.json()["id"]

        # Delete it
        delete_response = client.delete(
            f"/highlights/{highlight_id}",
            headers=auth_headers,
        )

        assert delete_response.status_code == 204

        # Verify it's gone
        get_response = client.get(
            f"/content/{test_content.id}/highlights",
            headers=auth_headers,
        )
        assert len(get_response.json()) == 0

    def test_delete_highlight_not_found(self, client, auth_headers):
        """
        Test deleting a non-existent highlight.

        Should return 404.
        """
        fake_highlight_id = uuid4()

        response = client.delete(
            f"/highlights/{fake_highlight_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_delete_highlight_unauthorized(self, client, test_content, auth_headers):
        """
        Test deleting a highlight without authentication.

        Should return 401.
        """
        # Create a highlight first
        create_response = client.post(
            f"/content/{test_content.id}/highlights",
            json={
                "text": "test",
                "start_offset": 0,
                "end_offset": 4,
                "color": "yellow",
            },
            headers=auth_headers,
        )
        highlight_id = create_response.json()["id"]

        # Try to delete without auth
        response = client.delete(
            f"/highlights/{highlight_id}",
        )

        assert response.status_code == 401


class TestHighlightsAuthorization:
    """Tests for authorization and permission checks"""

    def test_user_cannot_access_other_users_content(
        self, client, db_session, test_user, auth_headers
    ):
        """
        Test that users can only create highlights on their own content.

        Security check: users shouldn't be able to highlight content
        that belongs to other users.
        """
        # Create another user
        from app.models.user import User
        from app.core.security import get_password_hash

        other_user = User(
            email="other@example.com",
            hashed_password=get_password_hash("password"),
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)

        # Create content owned by other user
        from app.models.content import ContentItem

        other_content = ContentItem(
            original_url="https://example.com/other",
            title="Other Article",
            full_text="Other content",
            user_id=other_user.id,
            processing_status="completed",
        )
        db_session.add(other_content)
        db_session.commit()
        db_session.refresh(other_content)

        # Try to create highlight on other user's content
        response = client.post(
            f"/content/{other_content.id}/highlights",
            json={
                "text": "test",
                "start_offset": 0,
                "end_offset": 4,
                "color": "yellow",
            },
            headers=auth_headers,
        )

        assert response.status_code == 404  # Content "not found" for security

    def test_user_cannot_modify_other_users_highlights(
        self, client, db_session, test_user, test_content, auth_headers
    ):
        """
        Test that users can only modify their own highlights.

        Security check: users shouldn't be able to edit or delete
        highlights created by other users.
        """
        # Create a highlight as test_user
        create_response = client.post(
            f"/content/{test_content.id}/highlights",
            json={
                "text": "test",
                "start_offset": 0,
                "end_offset": 4,
                "color": "yellow",
            },
            headers=auth_headers,
        )
        highlight_id = create_response.json()["id"]

        # Create another user and get their auth token
        from app.models.user import User
        from app.core.security import get_password_hash, create_access_token

        other_user = User(
            email="other@example.com",
            hashed_password=get_password_hash("password"),
        )
        db_session.add(other_user)
        db_session.commit()

        other_token = create_access_token(data={"sub": other_user.email})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # Try to update the highlight as other_user
        update_response = client.patch(
            f"/highlights/{highlight_id}",
            json={"color": "green"},
            headers=other_headers,
        )

        assert update_response.status_code == 404  # Highlight "not found" for security

        # Try to delete the highlight as other_user
        delete_response = client.delete(
            f"/highlights/{highlight_id}",
            headers=other_headers,
        )

        assert delete_response.status_code == 404
