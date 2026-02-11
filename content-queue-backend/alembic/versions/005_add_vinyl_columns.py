"""add catalog_number column to vinyl_records

Revision ID: 005_vinyl_columns
Revises: 6ea16ce5c4b6
Create Date: 2026-02-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "005_vinyl_columns"
down_revision: Union[str, Sequence[str], None] = "6ea16ce5c4b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vinyl_records",
        sa.Column("catalog_number", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("vinyl_records", "catalog_number")
