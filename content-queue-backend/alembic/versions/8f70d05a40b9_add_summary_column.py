"""Add summary column

Revision ID: 8f70d05a40b9
Revises: 2f3g4h5i6j7k
Create Date: 2026-02-05 16:07:33.548372

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "8f70d05a40b9"
down_revision: Union[str, Sequence[str], None] = "2f3g4h5i6j7k"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("content_items", sa.Column("summary", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("content_items", "summary")
