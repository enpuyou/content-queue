"""Add reading_patterns column to users

Revision ID: 002_add_reading_patterns
Revises: 001_add_auto_tags
Create Date: 2026-02-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "002_add_reading_patterns"
down_revision = "001_add_auto_tags"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "reading_patterns", postgresql.JSONB(), server_default="{}", nullable=True
        ),
    )


def downgrade():
    op.drop_column("users", "reading_patterns")
