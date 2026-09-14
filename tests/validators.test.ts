import test from 'node:test'
import assert from 'node:assert/strict'
import { academicYearSchema, semesterSchema } from '../validators/academic-year'
import { classSchema } from '../validators/class'
import { parseClassQuery } from '../services/classes.service'

test('class validator accepts trimmed names and nullable assignments', () => {
  assert.deepEqual(classSchema.parse({ name: ' VII A ', grade_level: 7, homeroom_teacher_id: null }), { name: 'VII A', grade_level: 7, homeroom_teacher_id: null })
  assert.equal(classSchema.safeParse({ name: 'A', grade_level: 12, homeroom_teacher_id: '11111111-1111-4111-8111-111111111111' }).success, true)
})

test('class validator rejects invalid fields and invented year columns', () => {
  const valid = { name: 'A', grade_level: 1, homeroom_teacher_id: null }
  for (const patch of [{ name: ' ' }, { name: 'a'.repeat(101) }, { grade_level: 0 }, { grade_level: 13 }, { grade_level: 1.5 }, { grade_level: '7' }, { grade_level: NaN }, { homeroom_teacher_id: '' }, { homeroom_teacher_id: 'bad' }, { academic_year_id: 'unused' }]) {
    assert.equal(classSchema.safeParse({ ...valid, ...patch }).success, false)
  }
})

test('class query normalizes search and rejects malformed pages', () => {
  assert.deepEqual(parseClassQuery({ q: ' A ', page: '2' }), { search: 'A', page: 2 })
  for (const page of ['0', '-1', 'NaN', '2.5', '999999999999999', ['2']]) assert.equal(parseClassQuery({ page }).page, 1)
  assert.equal(parseClassQuery({ q: 'x'.repeat(200) }).search.length, 100)
})

test('academic year validator accepts sequential years and valid dates', () => {
  const result = academicYearSchema.safeParse({
    name: '2026/2027',
    start_date: '2026-07-01',
    end_date: '2027-06-30',
  })
  assert.equal(result.success, true)
})

test('academic year validator rejects non-sequential years and reversed dates', () => {
  assert.equal(academicYearSchema.safeParse({ name: '2026/2028', start_date: '', end_date: '' }).success, false)
  assert.equal(academicYearSchema.safeParse({ name: '2026/2027', start_date: '2027-01-01', end_date: '2026-12-31' }).success, false)
})

test('semester validator accepts only known semester names and UUID year', () => {
  const yearId = '11111111-1111-4111-8111-111111111111'
  assert.equal(semesterSchema.safeParse({ academic_year_id: yearId, name: 'ganjil' }).success, true)
  assert.equal(semesterSchema.safeParse({ academic_year_id: yearId, name: 'triwulan' }).success, false)
})
