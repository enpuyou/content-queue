"""Add auto_tags column to content_items

Revision ID: 001_add_auto_tags
Revises: 8f70d05a40b9
Create Date: 2026-02-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001_add_auto_tags"
down_revision = "8f70d05a40b9"
branch_labels = None
depends_on = None


def upgrade():
    # Add auto_tags column to content_items
    op.add_column(
        "content_items",
        sa.Column(
            "auto_tags",
            postgresql.ARRAY(sa.String(100)),
            server_default="{}",
            nullable=True,
        ),
    )


def downgrade():
    # Remove auto_tags column
    op.drop_column("content_items", "auto_tags")
