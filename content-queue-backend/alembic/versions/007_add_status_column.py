"""add status column to vinyl_records

Revision ID: 007_add_status
Revises: 006_add_videos
Create Date: 2026-02-11 08:30:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "007_add_status"
down_revision: Union[str, Sequence[str], None] = "006_add_videos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vinyl_records",
        sa.Column(
            "status", sa.String(length=50), nullable=True, server_default="collection"
        ),
    )
    op.create_index(
        op.f("ix_vinyl_records_status"), "vinyl_records", ["status"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_vinyl_records_status"), table_name="vinyl_records")
    op.drop_column("vinyl_records", "status")
