-- Forward-only class management safeguards. No initial-schema rewrites or data removal.
begin;

create function public.validate_class_homeroom_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.homeroom_teacher_id is not null then
    -- Locks serialize assignment against concurrent teacher/profile changes.
    perform t.id from public.teachers t
      join public.profiles p on p.id = t.profile_id
      where t.id = new.homeroom_teacher_id and t.is_active
        and p.is_active and p.role = 'homeroom_teacher'
      for share of t, p;
    if not found then
      raise exception 'Homeroom assignment requires an active homeroom teacher and profile'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger classes_validate_homeroom
before insert or update on public.classes
for each row execute function public.validate_class_homeroom_assignment();

create function public.protect_used_class_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Definer scope is required: hidden historical rows must also block CASCADE.
  if exists (select 1 from public.student_classes where class_id = old.id)
    or exists (select 1 from public.teacher_subjects where class_id = old.id)
    or exists (select 1 from public.report_cards where class_id = old.id) then
    raise exception 'Class has historical records and cannot be deleted' using errcode = '23503';
  end if;
  return old;
end;
$$;

create trigger classes_protect_used_delete
before delete on public.classes
for each row execute function public.protect_used_class_delete();

-- Trigger-only functions: no callable RPC grants to API roles.
revoke all on function public.validate_class_homeroom_assignment() from public, anon, authenticated;
revoke all on function public.protect_used_class_delete() from public, anon, authenticated;

-- Existing assignments are not rewritten. Eligibility is checked on every class
-- write; deactivated/re-roled staff must be replaced or cleared when editing.
commit;
