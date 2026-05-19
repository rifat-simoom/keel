"""UK tax rates and thresholds for 2024/25."""
from decimal import Decimal

# ── Income tax ────────────────────────────────────────────────────────────────
PERSONAL_ALLOWANCE = Decimal("12570")
BASIC_RATE_LIMIT = Decimal("50270")      # total income up to which 20% applies
HIGHER_RATE_LIMIT = Decimal("125140")
INCOME_TAX_BASIC = Decimal("0.20")
INCOME_TAX_HIGHER = Decimal("0.40")
INCOME_TAX_ADDITIONAL = Decimal("0.45")

# ── National Insurance ────────────────────────────────────────────────────────
NIC_SECONDARY_THRESHOLD = Decimal("9100")    # employer NIC kicks in here
NIC_PRIMARY_THRESHOLD = Decimal("12570")     # employee NIC kicks in here
NIC_UPPER_EARNINGS = Decimal("50270")
NIC_EMPLOYEE_MAIN = Decimal("0.08")          # 8% between PT and UEL
NIC_EMPLOYEE_UPPER = Decimal("0.02")         # 2% above UEL
NIC_EMPLOYER = Decimal("0.138")              # 13.8% above secondary threshold

# ── Dividends ─────────────────────────────────────────────────────────────────
DIVIDEND_ALLOWANCE = Decimal("500")
DIV_BASIC_RATE = Decimal("0.0875")
DIV_HIGHER_RATE = Decimal("0.3375")
DIV_ADDITIONAL_RATE = Decimal("0.3938")

# ── Corporation Tax ────────────────────────────────────────────────────────────
CT_SMALL_PROFITS_THRESHOLD = Decimal("50000")
CT_MAIN_THRESHOLD = Decimal("250000")
CT_SMALL_RATE = Decimal("0.19")
CT_MAIN_RATE = Decimal("0.25")
CT_MARGINAL_FRACTION = Decimal("3") / Decimal("200")   # 1.5% marginal relief fraction
