const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const shortDateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

export function formatDate(d: Date): string {
  return dateFmt.format(d)
}

export function formatShortDate(d: Date): string {
  return shortDateFmt.format(d)
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 3600 * 1000)
}

export function padHour(h: number): string {
  return String(h).padStart(2, '0')
}
