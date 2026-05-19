"""
PDF generation for invoices using fpdf2.
Returns bytes that can be served as application/pdf.
"""
from decimal import Decimal
from io import BytesIO

from fpdf import FPDF, XPos, YPos

from .models import Invoice


_KEEL_BLUE = (0, 87, 184)
_GRAY = (107, 114, 128)
_LIGHT_GRAY = (243, 244, 246)
_BLACK = (17, 24, 39)
_RED = (220, 38, 38)


class InvoicePDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*_GRAY)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def generate_invoice_pdf(invoice: Invoice, company_name: str) -> bytes:
    pdf = InvoicePDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ── Header ─────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(*_KEEL_BLUE)
    pdf.cell(0, 12, company_name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_GRAY)
    pdf.cell(0, 5, "Tax Invoice", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(8)

    # ── Two column: Invoice details | Client details ────────────────────────
    col_width = 90
    left_x = pdf.get_x()
    right_x = left_x + col_width + 10
    top_y = pdf.get_y()

    # Left col — invoice meta
    def kv(label: str, value: str) -> None:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_GRAY)
        pdf.set_x(left_x)
        pdf.cell(35, 5, label.upper(), new_x=XPos.RIGHT)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_BLACK)
        pdf.cell(col_width - 35, 5, value, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    kv("Invoice No.", invoice.invoice_number)
    kv("Issue Date", str(invoice.issue_date))
    kv("Due Date", str(invoice.due_date))
    kv("Status", invoice.status.upper())

    # Right col — bill to
    mid_y = pdf.get_y()
    pdf.set_xy(right_x, top_y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*_GRAY)
    pdf.cell(0, 5, "BILL TO", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_xy(right_x, top_y + 5)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*_BLACK)
    pdf.cell(0, 5, invoice.client_name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_xy(right_x, top_y + 10)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, invoice.client_email, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    addr = invoice.client_address
    if addr:
        for field in ("line1", "line2", "city", "postcode"):
            val = addr.get(field)
            if val:
                pdf.set_xy(right_x, pdf.get_y())
                pdf.cell(0, 5, val, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_y(max(mid_y, pdf.get_y()) + 6)

    # ── Divider ────────────────────────────────────────────────────────────
    pdf.set_draw_color(*_KEEL_BLUE)
    pdf.set_line_width(0.5)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(4)

    # ── Line items table header ────────────────────────────────────────────
    pdf.set_fill_color(*_LIGHT_GRAY)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*_GRAY)
    headers = [("Description", 80), ("Qty", 20), ("Unit Price", 30), ("VAT %", 20), ("Amount", 30)]
    for h, w in headers:
        pdf.cell(w, 7, h, fill=True, align="C" if h != "Description" else "L")
    pdf.ln()

    # ── Line items rows ────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_BLACK)
    for item in invoice.line_items:
        qty = Decimal(str(item["quantity"]))
        price = Decimal(str(item["unit_price"]))
        vat = Decimal(str(item["vat_rate"]))
        amount = (qty * price).quantize(Decimal("0.01"))
        vat_pct = int(vat * 100)

        pdf.cell(80, 6, str(item["description"])[:60])
        pdf.cell(20, 6, str(item["quantity"]), align="C")
        pdf.cell(30, 6, f"£{price:.2f}", align="C")
        pdf.cell(20, 6, f"{vat_pct}%", align="C")
        pdf.cell(30, 6, f"£{amount:.2f}", align="C")
        pdf.ln()

    pdf.ln(2)
    pdf.set_draw_color(*_LIGHT_GRAY)
    pdf.set_line_width(0.2)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(3)

    # ── Totals ─────────────────────────────────────────────────────────────
    def total_row(label: str, value: str, bold: bool = False) -> None:
        pdf.set_x(pdf.w - pdf.r_margin - 80)
        pdf.set_font("Helvetica", "B" if bold else "", 10 if bold else 9)
        if bold:
            pdf.set_text_color(*_KEEL_BLUE)
        else:
            pdf.set_text_color(*_GRAY)
        pdf.cell(50, 6, label, align="R")
        pdf.set_text_color(*_BLACK)
        pdf.cell(30, 6, value, align="R")
        pdf.ln()

    total_row("Subtotal", f"£{invoice.subtotal:.2f}")
    total_row("VAT", f"£{invoice.vat_amount:.2f}")
    total_row("Total (GBP)", f"£{invoice.total:.2f}", bold=True)

    # ── Notes ──────────────────────────────────────────────────────────────
    if invoice.notes:
        pdf.ln(6)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_GRAY)
        pdf.cell(0, 5, "NOTES", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_BLACK)
        pdf.multi_cell(0, 5, invoice.notes)

    # ── Footer text ────────────────────────────────────────────────────────
    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*_GRAY)
    pdf.multi_cell(
        0, 4,
        "Payment is due by the date shown above. Late payment interest may be charged "
        "under the Late Payment of Commercial Debts (Interest) Act 1998.",
    )

    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()
