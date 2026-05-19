"""initial — companies and user_profiles

Revision ID: 0001
Revises:
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("company_number", sa.Text, nullable=True),
        sa.Column("vat_number", sa.Text, nullable=True),
        sa.Column("utr", sa.Text, nullable=True),
        sa.Column("address", JSONB, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "user_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("keycloak_id", UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("full_name", sa.Text, nullable=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=True),
        sa.Column("role", sa.String(50), nullable=False, server_default="owner"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_index("ix_user_profiles_keycloak_id", "user_profiles", ["keycloak_id"], unique=True)

    op.create_table(
        "outbox_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("routing_key", sa.String(100), nullable=False),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("published", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("published_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("ix_outbox_events_published", "outbox_events", ["published"])
    op.create_index("ix_outbox_events_event_type", "outbox_events", ["event_type"])


def downgrade() -> None:
    op.drop_table("outbox_events")
    op.drop_table("user_profiles")
    op.drop_table("companies")
