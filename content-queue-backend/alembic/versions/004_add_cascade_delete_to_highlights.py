"""Add cascade delete to highlights foreign key

Revision ID: 004_cascade_delete
Revises: 003_add_embedding_to_highlights
Create Date: 2026-02-08 00:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "004_cascade_delete"
down_revision = "003_add_embedding_to_highlights"
branch_labels = None
depends_on = None


def upgrade():
    # Drop the existing foreign key constraint
    op.drop_constraint(
        "highlights_content_item_id_fkey", "highlights", type_="foreignkey"
    )

    # Re-add it with CASCADE on delete
    op.create_foreign_key(
        "highlights_content_item_id_fkey",
        "highlights",
        "content_items",
        ["content_item_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    # Drop the CASCADE foreign key
    op.drop_constraint(
        "highlights_content_item_id_fkey", "highlights", type_="foreignkey"
    )

    # Re-add without CASCADE
    op.create_foreign_key(
        "highlights_content_item_id_fkey",
        "highlights",
        "content_items",
        ["content_item_id"],
        ["id"],
    )
