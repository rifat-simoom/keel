"""Deadline calculation engine — pure functions, no I/O."""
from datetime import date, timedelta


def _last_day(year: int, month: int) -> date:
    if month == 12:
        return date(year, 12, 31)
    return date(year, month + 1, 1) - timedelta(days=1)


def _urgency(days: int) -> str:
    if days <= 7:
        return "critical"
    if days <= 30:
        return "warning"
    return "ok"


def vat_deadlines(stagger: str, today: date | None = None) -> list[dict]:
    """
    Return the next 4 VAT return filing deadlines for the given stagger group.
    Filing deadline = 1 calendar month + 7 days after quarter end.
    Stagger A: quarters end Jan/Apr/Jul/Oct
    Stagger B: quarters end Feb/May/Aug/Nov
    Stagger C: quarters end Mar/Jun/Sep/Dec
    """
    today = today or date.today()
    end_months = {"A": [1, 4, 7, 10], "B": [2, 5, 8, 11], "C": [3, 6, 9, 12]}.get(
        stagger.upper(), [3, 6, 9, 12]
    )
    deadlines = []
    year = today.year - 1

    while len(deadlines) < 4:
        for em in end_months:
            q_end = _last_day(year, em)
            # Filing deadline: 1 month + 7 days after quarter end
            filing_month = em + 1 if em < 12 else 1
            filing_year = year if em < 12 else year + 1
            filing_date = date(filing_year, filing_month, 7)
            if filing_date >= today:
                days = (filing_date - today).days
                deadlines.append({
                    "deadline_type": "vat_return",
                    "title": f"VAT return due — quarter ending {q_end.strftime('%d %b %Y')}",
                    "description": (
                        f"VAT return for the quarter ending {q_end.strftime('%d %B %Y')} "
                        f"must be filed and paid by {filing_date.strftime('%d %B %Y')}."
                    ),
                    "due_date": filing_date,
                    "days_until": days,
                    "route": "/tax",
                    "urgency": _urgency(days),
                })
            if len(deadlines) >= 4:
                break
        year += 1

    return sorted(deadlines, key=lambda d: d["due_date"])[:4]


def corp_tax_deadlines(year_end_month: int, today: date | None = None) -> list[dict]:
    """CT payment (9m+1d) and CT600 filing (12m) deadlines."""
    today = today or date.today()
    results = []

    for offset in range(-1, 3):
        ye = _last_day(today.year + offset, year_end_month)
        # Payment: 9 months + 1 day after year end
        pay_date = ye + timedelta(days=274)
        # Filing: 12 months after year end
        file_date = date(ye.year + 1, ye.month, ye.day)

        for d, label, desc in [
            (pay_date, "Corporation Tax payment due", f"CT payment for year ending {ye.strftime('%d %b %Y')}"),
            (file_date, "CT600 filing deadline", f"CT600 return for year ending {ye.strftime('%d %b %Y')}"),
        ]:
            if d >= today:
                days = (d - today).days
                results.append({
                    "deadline_type": "corp_tax_payment" if "payment" in label else "corp_tax_filing",
                    "title": label,
                    "description": desc,
                    "due_date": d,
                    "days_until": days,
                    "route": "/tax",
                    "urgency": _urgency(days),
                })

    return sorted(results, key=lambda d: d["due_date"])[:4]


def self_assessment_deadlines(today: date | None = None) -> list[dict]:
    """Self-assessment deadline: 31 January each year."""
    today = today or date.today()
    results = []
    for year in range(today.year, today.year + 3):
        d = date(year, 1, 31)
        if d >= today:
            days = (d - today).days
            results.append({
                "deadline_type": "self_assessment",
                "title": f"Self-assessment tax return — {year}",
                "description": f"Online self-assessment return for {year-1}/{str(year)[-2:]} must be filed by 31 January {year}.",
                "due_date": d,
                "days_until": days,
                "route": "/tax",
                "urgency": _urgency(days),
            })
    return results[:2]


def invoice_deadlines(invoices: list[dict], today: date | None = None) -> list[dict]:
    """Return upcoming invoice due-date deadlines (next 60 days, unpaid)."""
    today = today or date.today()
    results = []
    for inv in invoices:
        due = inv["due_date"] if isinstance(inv["due_date"], date) else date.fromisoformat(str(inv["due_date"]))
        if due >= today and inv.get("status") in ("sent", "viewed"):
            days = (due - today).days
            results.append({
                "deadline_type": "invoice_due",
                "title": f"Invoice {inv['invoice_number']} due",
                "description": f"Invoice to {inv['client_name']} for £{float(inv['total']):,.2f} is due on {due.strftime('%d %b %Y')}.",
                "due_date": due,
                "days_until": days,
                "route": f"/invoices/{inv['id']}",
                "urgency": _urgency(days),
            })
    return sorted(results, key=lambda d: d["due_date"])[:10]
