"""Add embedding column to highlights

Revision ID: 003_add_embedding_to_highlights
Revises: 002_add_reading_patterns
Create Date: 2026-02-06 00:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "003_add_embedding_to_highlights"
down_revision = "002_add_reading_patterns"
branch_labels = None
depends_on = None


def upgrade():
    # Create pgvector extension first
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Add embedding column using raw SQL for vector type
    op.execute("ALTER TABLE highlights ADD COLUMN embedding vector(1536)")


def downgrade():
    op.drop_column("highlights", "embedding")
