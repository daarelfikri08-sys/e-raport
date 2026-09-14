import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAverage, calculateClassAverage, calculateFinalScore, calculateGradeProgress, calculateRanking, calculateTotal } from '../lib/calculations'

test('calculateFinalScore normalizes weights and rounds to two decimals', () => {
  assert.equal(calculateFinalScore({ tugas: { score: 80, weight: 30 }, pts: { score: 70, weight: 30 }, pas: { score: 90, weight: 40 } }), 81)
  assert.equal(calculateFinalScore({ only: { score: 83.333, weight: 25 } }), 83.33)
  assert.equal(calculateFinalScore({}), 0)
})

test('calculateAverage handles empty input and rounds', () => {
  assert.equal(calculateAverage([]), 0)
  assert.equal(calculateAverage([80, 81, 82]), 81)
  assert.equal(calculateAverage([1, 2, 2]), 1.67)
})

test('calculateRanking uses competition ranking and preserves input indexes', () => {
  assert.deepEqual(calculateRanking([70, 90, 90, 80]), { 0: 4, 1: 1, 2: 1, 3: 3 })
})

test('total and class average ignore non-finite values', () => {
  assert.equal(calculateTotal([10, 20, Number.NaN]), 30)
  assert.equal(calculateClassAverage([80, 90, Number.POSITIVE_INFINITY]), 85)
})

test('grade progress is finite and clamped to a percentage', () => {
  assert.equal(calculateGradeProgress(3, 4), 75)
  assert.equal(calculateGradeProgress(6, 4), 100)
  assert.equal(calculateGradeProgress(1, 0), 0)
})
