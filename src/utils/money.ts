export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}
