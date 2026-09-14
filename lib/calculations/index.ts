const finite = (value: number): boolean => Number.isFinite(value)
const round = (value: number): number => Math.round(value * 100) / 100

export function calculateTotal(values: readonly number[]): number {
  return round(values.reduce((total, value) => total + (finite(value) ? value : 0), 0))
}
export function calculateAverage(scores: readonly number[]): number {
  const valid = scores.filter(finite)
  return valid.length ? round(calculateTotal(valid) / valid.length) : 0
}
export const calculateClassAverage = calculateAverage
export function calculateFinalScore(assessments: Record<string, { score: number; weight: number }>): number {
  let weighted = 0; let weight = 0
  for (const item of Object.values(assessments)) {
    if (!finite(item.score) || !finite(item.weight) || item.weight <= 0) continue
    weighted += item.score * item.weight
    weight += item.weight
  }
  return weight ? round(weighted / weight) : 0
}
export function calculateGradeProgress(completed: number, total: number): number {
  if (!finite(completed) || !finite(total) || total <= 0) return 0
  return round(Math.min(100, Math.max(0, completed / total * 100)))
}
export function calculateRanking(scores: readonly number[]): Record<number, number> {
  const sorted = scores.map((score, index) => ({ score: finite(score) ? score : -Infinity, index })).sort((a, b) => b.score - a.score)
  const result: Record<number, number> = {}; let rank = 1
  sorted.forEach((item, index) => { if (index && item.score < sorted[index - 1].score) rank = index + 1; result[item.index] = rank })
  return result
}
