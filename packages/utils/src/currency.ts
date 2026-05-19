export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export function penceToGBP(pence: number): number {
  return pence / 100
}

export function gbpToPence(gbp: number): number {
  return Math.round(gbp * 100)
}

export function calculateVat(amount: number, rate: 0 | 0.05 | 0.2): number {
  return Math.round(amount * rate * 100) / 100
}

export function calculateSubtotal(
  items: Array<{ quantity: number; unit_price: number }>,
): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
}
