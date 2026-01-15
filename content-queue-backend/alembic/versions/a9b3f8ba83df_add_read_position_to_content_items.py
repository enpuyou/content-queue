"""add_read_position_to_content_items

Revision ID: a9b3f8ba83df
Revises: 43acce7f6578
Create Date: 2026-01-12 23:55:37.019889

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a9b3f8ba83df"
down_revision: Union[str, Sequence[str], None] = "43acce7f6578"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add read_position column (0.0 to 1.0, representing 0% to 100%)
    op.add_column(
        "content_items",
        sa.Column("read_position", sa.Float, nullable=True, default=0.0),
    )


def downgrade():
    op.drop_column("content_items", "read_position")
