import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const migrationSource = await readFile(resolve(root, 'supabase/migrations/001_initial_schema.sql'), 'utf8')
// Supabase menyediakan pgcrypto. PGlite tidak membundel extension control file-nya,
// sedangkan gen_random_uuid() yang dipakai schema sudah tersedia sebagai built-in.
const migration = migrationSource.replace('create extension if not exists "pgcrypto";', '')
const seed = await readFile(resolve(root, 'supabase/seed.sql'), 'utf8')

const USERS = {
  admin: 'de000001-0000-4000-8000-000000000001',
  teacherA: 'de000001-0000-4000-8000-000000000002',
  teacherB: 'de000001-0000-4000-8000-000000000003',
  teacherC: 'de000001-0000-4000-8000-000000000004',
  homeroomA: 'de000001-0000-4000-8000-000000000005',
  homeroomB: 'de000001-0000-4000-8000-000000000006',
}

const db = new PGlite()
after(() => db.close())

// Supabase supplies these objects and grants outside application migrations.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`)
await db.exec(migration)
await db.exec(await readFile(resolve(root, 'supabase/migrations/002_class_management.sql'), 'utf8'))
await db.exec(await readFile(resolve(root, 'supabase/migrations/003_strengthen_delete_guards.sql'), 'utf8'))
await db.exec(await readFile(resolve(root, 'supabase/migrations/004_admin_master_data.sql'), 'utf8'))
await db.exec(await readFile(resolve(root, 'supabase/migrations/005_school_assets_storage.sql'), 'utf8'))
await db.exec(await readFile(resolve(root, 'supabase/migrations/006_audit_log.sql'), 'utf8'))
await db.query(
  `insert into auth.users(id) select unnest($1::uuid[])`,
  [Object.values(USERS)],
)

async function asUser(uid, sql, params = []) {
  // PGlite has one connection, so identity changes and tests must remain serial.
  await db.exec('set role authenticated')
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid])
  try {
    return await db.query(sql, params)
  } finally {
    await db.exec('reset role')
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

test('all six migrations preserve exactly the twenty application tables', { concurrency: false }, async () => {
  const { rows } = await db.query(`
    select tablename from pg_tables
    where schemaname = 'public'
    order by tablename
  `)
  assert.equal(rows.length, 20)
})

test('current seed executes unchanged after its six mapped Auth users exist', { concurrency: false }, async () => {
  // Seed dieksekusi tanpa normalisasi agar drift terhadap migration terdeteksi.
  await assert.doesNotReject(() => db.exec(seed))
})

test('seeded row counts match the documented demo data', { concurrency: false }, async () => {
  const expected = {
    school_settings: 1,
    academic_years: 1,
    semesters: 2,
    classes: 3,
    students: 30,
    subjects: 10,
    profiles: 6,
    teachers: 5,
    teacher_subjects: 30,
    grade_submissions: 30,
    grades: 90,
  }
  for (const [table, count] of Object.entries(expected)) {
    const { rows } = await db.query(`select count(*)::int as count from public.${table}`)
    assert.equal(rows[0].count, count, table)
  }
})

test('RLS boundaries and profile privilege columns are enforced', { concurrency: false }, async (t) => {
  // Batas akses diuji melalui role authenticated dan identitas JWT tiruan.
  await t.test('teacher A cannot update teacher B grade', async () => {
    const result = await asUser(USERS.teacherA, `
      update grades g set score=99
      where g.teacher_subject_id in (
        select ts.id from teacher_subjects ts join teachers t on t.id=ts.teacher_id
        where t.profile_id='${USERS.teacherB}'
      ) returning g.id`)
    assert.equal(result.rows.length, 0)
  })
  await t.test('homeroom sees own class only and cannot update grades', async () => {
    assert.equal((await asUser(USERS.homeroomA, 'select id from students')).rows.length, 10)
    assert.equal((await asUser(USERS.homeroomA, 'select id from grades')).rows.length, 30)
    assert.equal((await asUser(USERS.homeroomA, `update grades set score=99 returning id`)).rows.length, 0)
  })
  await t.test('admin can read and update grades as policy permits', async () => {
    assert.equal((await asUser(USERS.admin, 'select id from grades')).rows.length, 90)
    assert.equal((await asUser(USERS.admin, `update grades set score=82 where id=(select id from grades limit 1) returning id`)).rows.length, 1)
  })
  await t.test('teacher cannot escalate own role or change is_active', async () => {
    await assert.rejects(
      asUser(USERS.teacherA, `update profiles set role='admin', is_active=false where id='${USERS.teacherA}'`),
      /authorization|permission|42501/i,
    )
  })
})

test('grade uniqueness and score bounds are database constraints', { concurrency: false }, async () => {
  await assert.rejects(db.exec(`
    insert into grades(student_id,teacher_subject_id,assessment_type_id,semester_id,score)
    select student_id,teacher_subject_id,assessment_type_id,semester_id,70 from grades limit 1
  `), /unique|duplicate/i)
  await assert.rejects(db.exec(`
    insert into grades(student_id,teacher_subject_id,assessment_type_id,semester_id,score)
    select student_id,teacher_subject_id,(select id from assessment_types where code='PTS'),semester_id,101
    from grades limit 1
  `), /check|constraint/i)
})

test('academic period constraints and activation RPC are enforced', { concurrency: false }, async (t) => {
  const year2 = 'de000002-0000-4000-8000-000000000001'
  const sem2 = 'de000002-0000-4000-8000-000000000002'
  await db.query(`insert into academic_years(id,name,start_date,end_date) values($1,'2027/2028','2027-07-01','2028-06-30')`, [year2])
  await db.query(`insert into semesters(id,academic_year_id,name) values($1,$2,'ganjil')`, [sem2, year2])

  await t.test('invalid dates are rejected', async () => {
    await assert.rejects(db.exec(`insert into academic_years(name,start_date,end_date) values('bad','2028-07-01','2028-06-01')`), /check|constraint/i)
  })
  await t.test('non-admin activation is denied', async () => {
    await assert.rejects(asUser(USERS.teacherA, `select set_active_academic_period('${year2}','${sem2}')`), /administrator|permission|42501/i)
  })
  await t.test('activation is atomic and mismatch is rejected', async () => {
    await asUser(USERS.admin, `select set_active_academic_period('${year2}','${sem2}')`)
    assert.equal((await db.query(`select count(*)::int n from academic_years where is_active`)).rows[0].n, 1)
    assert.equal((await db.query(`select count(*)::int n from semesters where is_active`)).rows[0].n, 1)
    const oldSemester = (await db.query(`select id from semesters where academic_year_id<>$1 limit 1`, [year2])).rows[0].id
    await assert.rejects(asUser(USERS.admin, `select set_active_academic_period('${year2}','${oldSemester}')`), /does not belong/i)
    assert.equal((await db.query(`select id from semesters where is_active`)).rows[0].id, sem2)
  })
  await t.test('partial unique indexes permit no second active period', async () => {
    await assert.rejects(db.exec(`update academic_years set is_active=true where id<> '${year2}'`), /unique|duplicate/i)
    await assert.rejects(db.exec(`update semesters set is_active=true where id<> '${sem2}'`), /unique|duplicate|active semester/i)
    await assert.rejects(db.exec(`update academic_years set is_active=false where id='${year2}'`), /semester is active|check|constraint/i)
  })
})

test('used academic periods cannot be deleted despite cascade FKs', { concurrency: false }, async () => {
  const usedSemester = (await db.query(`select semester_id id from grades limit 1`)).rows[0].id
  const usedYear = (await db.query(`select academic_year_id id from semesters where id=$1`, [usedSemester])).rows[0].id
  await assert.rejects(asUser(USERS.admin, `delete from semesters where id='${usedSemester}'`), /historical|grades|23503/i)
  await assert.rejects(asUser(USERS.admin, `delete from academic_years where id='${usedYear}'`), /historical|semesters|23503/i)
})

test('class CRUD permits admin, denies other roles and detects missing rows', { concurrency: false }, async () => {
  const id = (await asUser(USERS.admin, `insert into classes(name,grade_level) values('CRUD test',7) returning id`)).rows[0].id
  assert.equal((await asUser(USERS.admin, 'select id from classes where id=$1', [id])).rows.length, 1)
  for (const uid of [USERS.teacherA, USERS.homeroomA]) {
    await assert.rejects(asUser(uid, `insert into classes(name,grade_level) values('Forbidden',7)`), /policy|permission/i)
    assert.equal((await asUser(uid, `update classes set name='Forbidden' where id=$1 returning id`, [id])).rows.length, 0)
    assert.equal((await asUser(uid, `delete from classes where id=$1 returning id`, [id])).rows.length, 0)
  }
  assert.equal((await asUser(USERS.admin, `update classes set name='Updated',grade_level=8 where id=$1 returning id`, [id])).rows.length, 1)
  assert.equal((await asUser(USERS.admin, 'delete from classes where id=$1 returning id', [id])).rows.length, 1)
  assert.equal((await asUser(USERS.admin, `update classes set name='Missing' where id=$1 returning id`, [id])).rows.length, 0)
  assert.equal((await asUser(USERS.admin, 'delete from classes where id=$1 returning id', [id])).rows.length, 0)
})

test('homeroom assignment requires an active teacher and active homeroom profile', { concurrency: false }, async () => {
  const teacher = (await db.query('select id from teachers where profile_id=$1', [USERS.homeroomA])).rows[0].id
  const ordinary = (await db.query('select id from teachers where profile_id=$1', [USERS.teacherA])).rows[0].id
  const id = (await asUser(USERS.admin, `insert into classes(name,grade_level,homeroom_teacher_id) values('Assignment test',1,$1) returning id`, [teacher])).rows[0].id
  for (const invalid of [ordinary, 'ffffffff-ffff-4fff-8fff-ffffffffffff']) {
    await assert.rejects(asUser(USERS.admin, 'update classes set homeroom_teacher_id=$1 where id=$2', [invalid, id]), /active homeroom/i)
    await assert.rejects(asUser(USERS.admin, `insert into classes(name,grade_level,homeroom_teacher_id) values('Invalid',1,$1)`, [invalid]), /active homeroom/i)
  }
  for (const [sql, parameter] of [
    ['update teachers set is_active=false where id=$1', teacher],
    ['update profiles set is_active=false where id=$1', USERS.homeroomA],
    ["update profiles set role='teacher' where id=$1", USERS.homeroomA],
    ['update teachers set profile_id=null where id=$1', teacher],
  ]) {
    await db.exec('begin')
    try {
      await db.query(sql, [parameter])
      await db.exec('savepoint attempt; set role authenticated')
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [USERS.admin])
      await assert.rejects(db.query('update classes set homeroom_teacher_id=$1 where id=$2', [teacher, id]), /active homeroom/i)
      await db.exec('rollback to savepoint attempt; reset role')
    } finally { await db.exec('rollback; reset role') }
  }
  assert.equal((await asUser(USERS.admin, 'update classes set homeroom_teacher_id=null where id=$1 returning id', [id])).rows.length, 1)
  await asUser(USERS.admin, 'delete from classes where id=$1', [id])
})

test('each class dependency independently prevents cascade deletion', { concurrency: false }, async () => {
  for (const table of ['student_classes', 'teacher_subjects', 'report_cards']) {
    await db.exec('begin')
    try {
      const id = (await db.query(`insert into classes(name,grade_level) values('Used test',1) returning id`)).rows[0].id
      if (table === 'report_cards') {
        await db.query(`insert into report_cards(student_id,class_id,semester_id) select (select id from students limit 1),$1,(select id from semesters limit 1)`, [id])
      } else {
        await db.query(`update ${table} set class_id=$1 where id=(select id from ${table} limit 1)`, [id])
      }
      const before = (await db.query(`select count(*)::int n from ${table} where class_id=$1`, [id])).rows[0].n
      await db.exec('savepoint attempt; set role authenticated')
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [USERS.admin])
      await assert.rejects(db.query('delete from classes where id=$1', [id]), /historical/i)
      await db.exec('rollback to savepoint attempt; reset role')
      assert.equal((await db.query(`select count(*)::int n from ${table} where class_id=$1`, [id])).rows[0].n, before)
      assert.equal((await db.query('select id from classes where id=$1', [id])).rows.length, 1)
    } finally { await db.exec('rollback; reset role') }
  }
})

test('class guards have fixed search paths and no API execute grants', { concurrency: false }, async () => {
  for (const name of ['validate_class_homeroom_assignment', 'protect_used_class_delete']) {
    for (const role of ['anon', 'authenticated']) {
      assert.equal((await db.query(`select has_function_privilege($1,$2,'EXECUTE') allowed`, [role, `public.${name}()`])).rows[0].allowed, false)
    }
    const row = (await db.query('select prosecdef,proconfig from pg_proc where proname=$1', [name])).rows[0]
    assert.equal(row.prosecdef, true)
    assert.ok(row.proconfig.some(value => value.startsWith('search_path=')))
  }
})

test('automatic audit log records master changes and stays append-only', { concurrency: false }, async () => {
  const subject = (await db.query(`insert into subjects(code,name) values('AUD21','Audit subject') returning id`)).rows[0].id

  // Trigger audit (INSERT) berjalan sebagai pemilik tabel (postgres), bukan sebagai user JWT.
  // Pastikan baris audit tercatat.
  const rows = await db.query(`
    select action, table_name, record_id
    from audit_logs
    where table_name='subjects' and record_id=$1
    order by created_at desc
  `, [subject])
  assert.ok(rows.rows.length >= 1, 'INSERT should be audited')
  assert.equal(rows.rows[0].action, 'INSERT')

  // Audit log tidak boleh diubah/dihapus oleh siapa pun (termasuk admin) melalui API/SQL client.
  // RLS tanpa policy UPDATE/DELETE menolak secara senyap: 0 baris terpengaruh.
  const auditId = rows.rows[0].id
  assert.equal((await asUser(USERS.admin, `update audit_logs set action='TAMPERED' where id=$1 returning id`, [auditId])).rows.length, 0)
  assert.equal((await asUser(USERS.admin, `delete from audit_logs where id=$1 returning id`, [auditId])).rows.length, 0)

  // Non-admin tidak bisa membaca audit log (RLS senyap: 0 baris).
  assert.equal((await asUser(USERS.teacherA, `select * from audit_logs`)).rows.length, 0)
})

test('Phase 3 master RLS, soft status, and dependency guards work', { concurrency: false }, async () => {
  const subject = (await asUser(USERS.admin, `insert into subjects(code,name) values('CRUD4','Phase 3') returning id`)).rows[0].id
  assert.equal((await asUser(USERS.admin, `update subjects set is_active=false where id=$1 returning id`, [subject])).rows.length, 1)
  const linkedTeacher = (await db.query('select id from teachers where profile_id=$1', [USERS.teacherB])).rows[0].id
  await asUser(USERS.admin, `select set_teacher_linked_status($1,false)`, [linkedTeacher])
  assert.equal((await db.query('select is_active from teachers where id=$1', [linkedTeacher])).rows[0].is_active, false)
  assert.equal((await db.query('select is_active from profiles where id=$1', [USERS.teacherB])).rows[0].is_active, false)
  const usedAssignment = (await db.query('select teacher_subject_id id from grades limit 1')).rows[0].id
  await assert.rejects(asUser(USERS.admin, 'delete from teacher_subjects where id=$1', [usedAssignment]), /grades or submissions|23503/i)
  const usedAssessment = (await db.query('select assessment_type_id id from grades limit 1')).rows[0].id
  await assert.rejects(asUser(USERS.admin, 'update assessment_types set is_active=false where id=$1', [usedAssessment]), /referenced assessment|23503/i)
})
