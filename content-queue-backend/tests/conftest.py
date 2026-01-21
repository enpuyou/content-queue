"""
Pytest configuration and fixtures for testing.

This module provides reusable test fixtures for database setup,
test client creation, and authenticated user sessions.

Note: Tests use PostgreSQL (not SQLite) because the ContentItem model
uses PostgreSQL-specific features (ARRAY, Vector types).
"""

import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.content import ContentItem
from app.core.security import get_password_hash, create_access_token


# Use PostgreSQL test database
# Make sure you have a test database created: createdb content_queue_test
SQLALCHEMY_TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/content_queue_test",
)

engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL)


# Enable pgvector extension for testing
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Enable pgvector extension when connecting to test database"""
    with dbapi_conn.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
        dbapi_conn.commit()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """
    Create a fresh database session for each test.

    This fixture:
    1. Creates all tables in the test database
    2. Provides a database session to the test
    3. Rolls back changes and drops tables after the test

    Yields:
        Session: A SQLAlchemy database session
    """
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    Create a test client with dependency injection.

    This overrides the get_db dependency to use our test database
    instead of the production database.

    Args:
        db_session: The test database session fixture

    Returns:
        TestClient: A FastAPI test client
    """

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db_session):
    """
    Create a test user in the database.

    This user can be used for authentication tests and
    creating content/highlights.

    Args:
        db_session: The test database session fixture

    Returns:
        User: A test user object with email test@example.com
    """
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_headers(test_user):
    """
    Generate authentication headers for API requests.

    Creates a JWT token for the test user and returns
    properly formatted authorization headers.

    Args:
        test_user: The test user fixture

    Returns:
        dict: Headers with Bearer token authentication
    """
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(scope="function")
def test_content(db_session, test_user):
    """
    Create a test content item for highlight testing.

    This provides a sample article that highlights can be
    attached to during tests.

    Args:
        db_session: The test database session fixture
        test_user: The test user fixture

    Returns:
        ContentItem: A test content item with sample text
    """
    content = ContentItem(
        original_url="https://example.com/article",
        title="Test Article",
        author="Test Author",
        full_text="This is a test article with enough content to highlight. " * 10,
        user_id=test_user.id,
        processing_status="completed",
    )
    db_session.add(content)
    db_session.commit()
    db_session.refresh(content)
    return content
