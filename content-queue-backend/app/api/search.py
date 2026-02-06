from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.content import ContentItem
from app.schemas.content import ContentItemResponse
from pydantic import BaseModel

router = APIRouter(prefix="/search", tags=["search"])


class SimilarContentResponse(BaseModel):
    """Response for similar content"""

    item: ContentItemResponse
    similarity_score: float


@router.get("/{item_id}/similar", response_model=list[SimilarContentResponse])
def find_similar_content(
    item_id: UUID,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Find content items similar to the given item.

    - Uses cosine similarity on embeddings
    - Returns most similar items first
    - Only searches user's own content
    """
    # Get the source item
    source_item = (
        db.query(ContentItem)
        .filter(
            ContentItem.id == item_id,
            ContentItem.user_id == current_user.id,
            ContentItem.deleted_at.is_(None),
        )
        .first()
    )

    if not source_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if source_item.embedding is None or len(source_item.embedding) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source item has no embedding yet. Please wait for processing to complete.",
        )

    # Convert embedding to string format for PostgreSQL
    embedding_str = "[" + ",".join(map(str, source_item.embedding)) + "]"

    # Find similar items using pgvector cosine similarity
    # cosine_distance returns 0 for identical, 2 for opposite
    # We convert to similarity score: 1 - (distance / 2)
    similar_query = text(
        """
        SELECT
            id,
            user_id,
            original_url,
            title,
            description,
            thumbnail_url,
            content_type,
            summary,
            tags,
            full_text,
            word_count,
            reading_time_minutes,
            read_position,
            is_read,
            is_archived,
            processing_status,
            created_at,
            updated_at,
            (1 - (embedding <=> CAST(:source_embedding AS vector)) / 2) as similarity
        FROM content_items
        WHERE user_id = :user_id
            AND id != :source_id
            AND deleted_at IS NULL
            AND embedding IS NOT NULL
        ORDER BY embedding <=> CAST(:source_embedding AS vector)
        LIMIT :limit
    """
    )

    results = db.execute(
        similar_query,
        {
            "source_embedding": embedding_str,
            "user_id": current_user.id,
            "source_id": item_id,
            "limit": limit,
        },
    ).fetchall()

    # Format response
    similar_items = []
    for row in results:
        item_dict = {
            "id": row.id,
            "user_id": row.user_id,
            "original_url": row.original_url,
            "title": row.title,
            "description": row.description,
            "thumbnail_url": row.thumbnail_url,
            "content_type": row.content_type,
            "summary": row.summary,
            "tags": row.tags,
            "full_text": row.full_text,
            "word_count": row.word_count,
            "reading_time_minutes": row.reading_time_minutes,
            "read_position": row.read_position,
            "is_read": row.is_read,
            "is_archived": row.is_archived,
            "processing_status": row.processing_status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

        similar_items.append(
            {"item": item_dict, "similarity_score": float(row.similarity)}
        )

    return similar_items


@router.get("/semantic", response_model=list[SimilarContentResponse])
def semantic_search(
    query: str = Query(..., min_length=3),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Search content by semantic meaning.

    - Converts query to embedding
    - Finds content with similar meaning
    - Not just keyword matching!
    """
    from openai import OpenAI
    from app.core.config import settings

    # Generate embedding for search query
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(
        model="text-embedding-3-small", input=query, encoding_format="float"
    )

    query_embedding = response.data[0].embedding

    # Convert embedding to string format for PostgreSQL
    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

    # Find similar items
    similar_query = text(
        """
        SELECT
            id,
            user_id,
            original_url,
            title,
            description,
            thumbnail_url,
            content_type,
            summary,
            tags,
            full_text,
            word_count,
            reading_time_minutes,
            read_position,
            is_read,
            is_archived,
            processing_status,
            created_at,
            updated_at,
            (1 - (embedding <=> CAST(:query_embedding AS vector)) / 2) as similarity
        FROM content_items
        WHERE user_id = :user_id
            AND deleted_at IS NULL
            AND embedding IS NOT NULL
        ORDER BY embedding <=> CAST(:query_embedding AS vector)
        LIMIT :limit
    """
    )

    results = db.execute(
        similar_query,
        {"query_embedding": embedding_str, "user_id": current_user.id, "limit": limit},
    ).fetchall()

    # Format response
    search_results = []
    for row in results:
        item_dict = {
            "id": row.id,
            "user_id": row.user_id,
            "original_url": row.original_url,
            "title": row.title,
            "description": row.description,
            "thumbnail_url": row.thumbnail_url,
            "content_type": row.content_type,
            "summary": row.summary,
            "tags": row.tags,
            "full_text": row.full_text,
            "word_count": row.word_count,
            "reading_time_minutes": row.reading_time_minutes,
            "read_position": row.read_position,
            "is_read": row.is_read,
            "is_archived": row.is_archived,
            "processing_status": row.processing_status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

        search_results.append(
            {"item": item_dict, "similarity_score": float(row.similarity)}
        )

    return search_results
