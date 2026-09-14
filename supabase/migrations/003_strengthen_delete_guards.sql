-- ============================================================
-- MIGRATION 003: STRENGTHEN DELETE GUARDS
-- Fix: academic year with semesters must not be deletable
-- Fix: active semester/year must not be deletable
-- Run AFTER 001_initial_schema.sql and 002_class_management.sql
-- ============================================================

begin;

-- ============================================================
-- Replace guard_delete_academic_year with stricter version
-- Now blocks deletion if the year has ANY semesters (even empty ones),
-- because deleting the year would cascade-delete those semesters.
-- ============================================================

create or replace function public.guard_delete_academic_year()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  -- Block if year is currently active
  if old.is_active then
    raise exception 'Cannot delete the active academic year. Deactivate it first by activating another period.'
      using errcode = '23503';
  end if;

  -- Block if any semesters exist under this year
  -- (they would be cascade-deleted silently)
  if exists (select 1 from public.semesters where academic_year_id = old.id) then
    raise exception 'Cannot delete academic year that has semesters. Delete all semesters first.'
      using errcode = '23503';
  end if;

  -- Block if student enrollment history exists
  if exists (select 1 from public.student_classes where academic_year_id = old.id) then
    raise exception 'Cannot delete academic year with student enrollment history.'
      using errcode = '23503';
  end if;

  -- Block if teacher assignment history exists
  if exists (select 1 from public.teacher_subjects where academic_year_id = old.id) then
    raise exception 'Cannot delete academic year with teacher assignments.'
      using errcode = '23503';
  end if;

  return old;
end;
$$;

-- Recreate trigger with updated function
drop trigger if exists guard_delete_academic_year on public.academic_years;
create trigger guard_delete_academic_year
before delete on public.academic_years
for each row execute function public.guard_delete_academic_year();

-- ============================================================
-- Replace guard_delete_semester with stricter version
-- Now also blocks deletion of the active semester
-- ============================================================

create or replace function public.guard_delete_semester()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  -- Block if semester is currently active
  if old.is_active then
    raise exception 'Cannot delete the active semester. Activate another semester first.'
      using errcode = '23503';
  end if;

  -- Block if grades exist for this semester
  if exists (select 1 from public.grades where semester_id = old.id) then
    raise exception 'Cannot delete semester with grades.'
      using errcode = '23503';
  end if;

  -- Block if grade submissions exist
  if exists (select 1 from public.grade_submissions where semester_id = old.id) then
    raise exception 'Cannot delete semester with grade submissions.'
      using errcode = '23503';
  end if;

  -- Block if report cards exist
  if exists (select 1 from public.report_cards where semester_id = old.id) then
    raise exception 'Cannot delete semester with report cards.'
      using errcode = '23503';
  end if;

  -- Block if attendance records exist
  if exists (select 1 from public.attendance where semester_id = old.id) then
    raise exception 'Cannot delete semester with attendance records.'
      using errcode = '23503';
  end if;

  -- Block if extracurricular records exist
  if exists (select 1 from public.student_extracurriculars where semester_id = old.id) then
    raise exception 'Cannot delete semester with extracurricular records.'
      using errcode = '23503';
  end if;

  -- Block if achievement records exist
  if exists (select 1 from public.achievements where semester_id = old.id) then
    raise exception 'Cannot delete semester with achievement records.'
      using errcode = '23503';
  end if;

  -- Block if behavior records exist
  if exists (select 1 from public.behavior_records where semester_id = old.id) then
    raise exception 'Cannot delete semester with behavior records.'
      using errcode = '23503';
  end if;

  return old;
end;
$$;

-- Recreate trigger with updated function
drop trigger if exists guard_delete_semester on public.semesters;
create trigger guard_delete_semester
before delete on public.semesters
for each row execute function public.guard_delete_semester();

-- Revoke execution from API roles (triggers fire automatically, no direct call needed)
revoke all on function public.guard_delete_academic_year() from public;
revoke all on function public.guard_delete_academic_year() from anon;
revoke all on function public.guard_delete_semester() from public;
revoke all on function public.guard_delete_semester() from anon;

commit;
