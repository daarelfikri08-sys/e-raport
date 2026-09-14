export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}
export function formatNumber(value: number): string {
  return Number.isFinite(value) ? new Intl.NumberFormat('id-ID').format(value) : ''
}
