-- Phase 3 forward-only integrity and secure administrative RPCs.
-- Run after 001, 002, and 003. Existing migrations are intentionally unchanged.
begin;

-- Add constraints only when existing data can satisfy them. NIS remains nullable at
-- database level for safe rollout, while new/edited records require it in the app.
do $$ begin
  if not exists (select 1 from public.classes group by lower(btrim(name)) having count(*) > 1) then
    create unique index if not exists uq_classes_name_ci on public.classes (lower(btrim(name)));
  end if;
end $$;
create index if not exists idx_teachers_name_lower on public.teachers (lower(full_name));
create index if not exists idx_students_name_lower on public.students (lower(full_name));
create index if not exists idx_subjects_name_lower on public.subjects (lower(name));
create index if not exists idx_teacher_subjects_year on public.teacher_subjects (academic_year_id);
do $$ begin
  if (select count(*) from public.school_settings) <= 1 then
    create unique index if not exists uq_school_settings_singleton on public.school_settings ((true));
  end if;
end $$;
alter table public.assessment_types drop constraint if exists assessment_types_positive_weight;
alter table public.assessment_types add constraint assessment_types_positive_weight check (weight > 0 and weight <= 100);

create or replace function public.set_teacher_linked_status(target_teacher uuid, target_active boolean)
returns void language plpgsql security definer set search_path = pg_catalog, public, auth as $$
declare linked_profile uuid;
begin
  if public.current_user_role() is distinct from 'admin'::public.app_role then raise exception 'Administrator role required' using errcode = '42501'; end if;
  select profile_id into linked_profile from public.teachers where id = target_teacher for update;
  if not found then raise exception 'Teacher not found' using errcode = '22023'; end if;
  update public.teachers set is_active = target_active where id = target_teacher;
  if linked_profile is not null then update public.profiles set is_active = target_active where id = linked_profile; end if;
end $$;
revoke all on function public.set_teacher_linked_status(uuid, boolean) from public, anon;
grant execute on function public.set_teacher_linked_status(uuid, boolean) to authenticated;

create or replace function public.guard_assignment_delete() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.grades where teacher_subject_id = old.id) or exists (select 1 from public.grade_submissions where teacher_subject_id = old.id) then raise exception 'Assignment has grades or submissions and cannot be deleted' using errcode = '23503'; end if;
  return old;
end $$;
drop trigger if exists teacher_subjects_guard_delete on public.teacher_subjects;
create trigger teacher_subjects_guard_delete before delete on public.teacher_subjects for each row execute function public.guard_assignment_delete();
revoke all on function public.guard_assignment_delete() from public, anon, authenticated;

create or replace function public.guard_assessment_disable() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_active and not new.is_active and exists (select 1 from public.grades where assessment_type_id = old.id) then raise exception 'Referenced assessment type cannot be disabled' using errcode = '23503'; end if;
  return new;
end $$;
drop trigger if exists assessment_types_guard_disable on public.assessment_types;
create trigger assessment_types_guard_disable before update of is_active on public.assessment_types for each row execute function public.guard_assessment_disable();
revoke all on function public.guard_assessment_disable() from public, anon, authenticated;
commit;
