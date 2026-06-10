.PHONY: verify verify-backend verify-web verify-mobile verify-schema

# ── Top-level gate ──────────────────────────────────────────────────────────
# Run this at the end of every agent session.
# Override SESSION to scope the check, e.g.:  make verify SESSION=s1.3
verify:
	@echo "==> Keel verify gate (SESSION=$(or $(SESSION),all))"
	@$(MAKE) verify-backend
	@$(MAKE) verify-web
	@$(MAKE) verify-mobile
	@echo "==> All checks passed."

# ── Backend ─────────────────────────────────────────────────────────────────
verify-backend:
	@echo "--- ruff ---"
	ruff check backend/
	@echo "--- mypy ---"
	mypy backend/ --ignore-missing-imports
	@echo "--- pytest ---"
	pytest backend/ -x -q --tb=short

# ── Web ──────────────────────────────────────────────────────────────────────
verify-web:
	@echo "--- web tests ---"
	pnpm --filter web test --run

# ── Mobile ───────────────────────────────────────────────────────────────────
verify-mobile:
	@echo "--- mobile tests ---"
	pnpm --filter mobile test --run

# ── Schema only (fast check for db-schema sessions) ──────────────────────────
verify-schema:
	@echo "--- alembic upgrade ---"
	alembic -c backend/alembic.ini upgrade head
	@echo "--- alembic downgrade ---"
	alembic -c backend/alembic.ini downgrade -1
	@echo "--- alembic upgrade (restore) ---"
	alembic -c backend/alembic.ini upgrade head
	@echo "--- schema unit tests ---"
	pytest backend/ -x -q --tb=short -k "test_models"
