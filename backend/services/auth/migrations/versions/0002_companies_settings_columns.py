"""add settings columns to companies

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-20
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("is_vat_registered", sa.Boolean, nullable=False, server_default="false"))
    op.add_column("companies", sa.Column("vat_scheme", sa.String(20), nullable=False, server_default="cash"))
    op.add_column("companies", sa.Column("vat_stagger", sa.String(1), nullable=False, server_default="A"))
    op.add_column("companies", sa.Column("year_end_month", sa.Integer, nullable=False, server_default="3"))
    op.add_column("companies", sa.Column("payment_terms_days", sa.Integer, nullable=False, server_default="30"))
    op.add_column("companies", sa.Column("invoice_footer", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "invoice_footer")
    op.drop_column("companies", "payment_terms_days")
    op.drop_column("companies", "year_end_month")
    op.drop_column("companies", "vat_stagger")
    op.drop_column("companies", "vat_scheme")
    op.drop_column("companies", "is_vat_registered")
