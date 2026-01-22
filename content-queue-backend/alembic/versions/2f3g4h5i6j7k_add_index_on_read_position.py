"""add_index_on_read_position

Revision ID: 2f3g4h5i6j7k
Revises: 1a2b3c4d5e6f
Create Date: 2026-01-22 12:00:00

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "2f3g4h5i6j7k"
down_revision: Union[str, Sequence[str], None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add index on read_position for fast filtering and sorting
    # Helps with queries that check reading_status (which depends on read_position)
    op.create_index(
        "ix_content_items_read_position",
        "content_items",
        ["read_position"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_content_items_read_position", table_name="content_items")
