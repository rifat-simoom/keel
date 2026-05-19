export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10) as string
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10) as string
}

export function daysUntil(iso: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  return Math.round((target.getTime() - now.getTime()) / 86_400_000)
}

export function isOverdue(dueDateIso: string): boolean {
  return daysUntil(dueDateIso) < 0
}
