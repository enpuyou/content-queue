"""add videos column to vinyl_records

Revision ID: 006_add_videos
Revises: 005_vinyl_columns
Create Date: 2026-02-11 08:20:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "006_add_videos"
down_revision: Union[str, Sequence[str], None] = "005_vinyl_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vinyl_records",
        sa.Column("videos", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("vinyl_records", "videos")
