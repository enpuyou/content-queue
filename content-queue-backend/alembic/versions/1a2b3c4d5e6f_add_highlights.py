"""add highlights table

Revision ID: 1a2b3c4d5e6f
Revises: 83bd90620143
Create Date: 2026-01-19

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "83bd90620143"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "highlights",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column("color", sa.String(20), nullable=False, server_default="yellow"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["content_item_id"], ["content_items.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )


def downgrade():
    op.drop_table("highlights")
