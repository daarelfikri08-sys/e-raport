-- ============================================================
-- MIGRATION 006: AUTOMATIC AUDIT LOG
-- Mencatat INSERT/UPDATE/DELETE pada tabel akademik utama.
-- append-only: client/API tidak punya policy INSERT/UPDATE/DELETE
-- pada audit_logs; hanya admin yang dapat membaca.
-- ============================================================

begin;

-- ============================================================
-- Fungsi trigger audit (SECURITY DEFINER, search_path tetap)
-- ============================================================

create or replace function public.audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  insert into public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    created_at
  ) values (
    auth.uid(),
    upper(tg_op),
    tg_table_name,
    coalesce((row_to_json(new))::jsonb ->> 'id', (row_to_json(old))::jsonb ->> 'id')::uuid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    now()
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_log_trigger() from public;
revoke all on function public.audit_log_trigger() from anon;
revoke all on function public.audit_log_trigger() from authenticated;

-- ============================================================
-- Helper: pasang trigger audit pada sebuah tabel
-- ============================================================

create or replace function public.enable_audit_log(table_to_audit text, trigger_name text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  payload text;
begin
  -- Hanya izinkan nama tabel/trigger yang aman (format identifier PostgreSQL)
  if not table_to_audit ~ '^[a-z_][a-z0-9_]*$' then
    raise exception 'invalid table name';
  end if;
  if not trigger_name ~ '^[a-z_][a-z0-9_]*$' then
    raise exception 'invalid trigger name';
  end if;

  execute format(
    'drop trigger if exists %I on public.%I;',
    trigger_name, table_to_audit
  );
  execute format(
    'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_log_trigger();',
    trigger_name, table_to_audit
  );
end;
$$;

revoke all on function public.enable_audit_log(text, text) from public;
revoke all on function public.enable_audit_log(text, text) from anon;

-- ============================================================
-- Pasang audit pada tabel akademik utama
-- (students, teachers, classes, subjects, teacher_subjects,
--  assessment_types, academic_years, semesters)
-- Nilai (grades/grade_submissions) tidak diaudit penuh karena
-- sangat sering berubah; utamakan data master akademik.
-- ============================================================

select public.enable_audit_log('students', 'audit_students');
select public.enable_audit_log('teachers', 'audit_teachers');
select public.enable_audit_log('classes', 'audit_classes');
select public.enable_audit_log('subjects', 'audit_subjects');
select public.enable_audit_log('teacher_subjects', 'audit_teacher_subjects');
select public.enable_audit_log('assessment_types', 'audit_assessment_types');
select public.enable_audit_log('academic_years', 'audit_academic_years');
select public.enable_audit_log('semesters', 'audit_semesters');

commit;