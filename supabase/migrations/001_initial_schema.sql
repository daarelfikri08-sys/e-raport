-- ============================================================
-- E-RAPORT DATABASE - INITIAL SCHEMA
-- PostgreSQL / Supabase
-- Original SQL as specified
-- ============================================================

begin;

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

do $$
begin
  create type public.app_role as enum (
    'admin',
    'teacher',
    'homeroom_teacher'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.semester_type as enum (
    'ganjil',
    'genap'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.grade_status as enum (
    'draft',
    'submitted',
    'verified',
    'locked'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.gender_type as enum (
    'L',
    'P'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- SCHOOL SETTINGS
-- ============================================================

create table if not exists public.school_settings (
  id uuid primary key default gen_random_uuid(),

  school_name text not null,
  school_npsn text,
  school_address text,
  school_phone text,
  school_email text,
  school_website text,

  principal_name text,
  principal_nip text,

  logo_url text,

  ranking_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ACADEMIC YEARS
-- ============================================================

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),

  name text not null unique,
  start_date date,
  end_date date,

  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint academic_years_valid_dates check (
    start_date is null or end_date is null or end_date >= start_date
  )
);

-- ============================================================
-- SEMESTERS
-- ============================================================

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),

  academic_year_id uuid not null
    references public.academic_years(id)
    on delete cascade,

  name public.semester_type not null,

  is_active boolean not null default false,

  created_at timestamptz not null default now(),

  unique(academic_year_id, name)
);

-- ============================================================
-- PROFILES
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  full_name text not null,

  role public.app_role not null,

  avatar_url text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEACHERS
-- ============================================================

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid unique
    references public.profiles(id)
    on delete set null,

  nip text unique,
  nuptk text,

  full_name text not null,

  email text,
  phone text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- STUDENTS
-- ============================================================

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),

  nis text unique,
  nisn text unique,

  full_name text not null,

  gender public.gender_type,

  birth_place text,
  birth_date date,

  nik text,

  address text,

  father_name text,
  mother_name text,

  phone text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CLASSES
-- ============================================================

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  grade_level integer not null,

  homeroom_teacher_id uuid
    references public.teachers(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (grade_level between 1 and 12)
);

-- ============================================================
-- STUDENT CLASS HISTORY
-- ============================================================

create table if not exists public.student_classes (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.students(id)
    on delete cascade,

  class_id uuid not null
    references public.classes(id)
    on delete cascade,

  academic_year_id uuid not null
    references public.academic_years(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique(student_id, academic_year_id)
);

-- ============================================================
-- SUBJECTS
-- ============================================================

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),

  code text unique,
  name text not null,

  group_name text,

  minimum_score numeric(5,2) default 75,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEACHER SUBJECT ASSIGNMENTS
-- ============================================================

create table if not exists public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),

  teacher_id uuid not null
    references public.teachers(id)
    on delete cascade,

  subject_id uuid not null
    references public.subjects(id)
    on delete cascade,

  class_id uuid not null
    references public.classes(id)
    on delete cascade,

  academic_year_id uuid not null
    references public.academic_years(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique(
    teacher_id,
    subject_id,
    class_id,
    academic_year_id
  )
);

-- ============================================================
-- ASSESSMENT TYPES
-- ============================================================

create table if not exists public.assessment_types (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  code text not null,

  weight numeric(5,2) not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  unique(code)
);

-- ============================================================
-- GRADES
-- ============================================================

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.students(id)
    on delete cascade,

  teacher_subject_id uuid not null
    references public.teacher_subjects(id)
    on delete cascade,

  assessment_type_id uuid not null
    references public.assessment_types(id)
    on delete restrict,

  semester_id uuid not null
    references public.semesters(id)
    on delete cascade,

  score numeric(5,2),

  notes text,

  status public.grade_status not null default 'draft',

  submitted_at timestamptz,
  verified_at timestamptz,
  locked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    score is null
    or (score >= 0 and score <= 100)
  ),

  unique(
    student_id,
    teacher_subject_id,
    assessment_type_id,
    semester_id
  )
);

-- ============================================================
-- GRADE SUBMISSIONS
-- ============================================================

create table if not exists public.grade_submissions (
  id uuid primary key default gen_random_uuid(),

  teacher_subject_id uuid not null
    references public.teacher_subjects(id)
    on delete cascade,

  semester_id uuid not null
    references public.semesters(id)
    on delete cascade,

  status public.grade_status not null default 'draft',

  submitted_by uuid
    references public.profiles(id)
    on delete set null,

  submitted_at timestamptz,

  verified_by uuid
    references public.profiles(id)
    on delete set null,

  verified_at timestamptz,

  locked_by uuid
    references public.profiles(id)
    on delete set null,

  locked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(teacher_subject_id, semester_id)
);

-- ============================================================
-- REPORT CARDS
-- ============================================================

create table if not exists public.report_cards (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.students(id)
    on delete cascade,

  class_id uuid not null
    references public.classes(id)
    on delete cascade,

  semester_id uuid not null
    references public.semesters(id)
    on delete cascade,

  total_score numeric(10,2),
  average_score numeric(6,2),

  ranking integer,

  homeroom_note text,

  status text not null default 'draft',

  generated_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(student_id, semester_id)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.students(id)
    on delete cascade,

  semester_id uuid not null
    references public.semesters(id)
    on delete cascade,

  sick integer not null default 0,
  permission integer not null default 0,
  absent integer not null default 0,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(student_id, semester_id),

  check(sick >= 0),
  check(permission >= 0),
  check(absent >= 0)
);

-- ============================================================
-- EXTRACURRICULARS
-- ============================================================

create table if not exists public.extracurriculars (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  description text,

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

-- ============================================================
-- STUDENT EXTRACURRICULAR
-- ============================================================

create table if not exists public.student_extracurriculars (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.students(id)
    on delete cascade,

  extracurricular_id uuid not null
    references public.extracurriculars(id)
    on delete cascade,

  semester_id uuid not null
    references public.semesters(id)
    on delete cascade,

  score numeric(5,2),

  description text,

  created_at timestamptz not null default now(),

  unique(
    student_id,
    extracurricular_id,
    semester_id
  )
);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.students(id)
    on delete cascade,

  semester_id uuid not null
    references public.semesters(id)
    on delete cascade,

  title text not null,

  level text,

  description text,

  created_at timestamptz not null default now()
);

-- ============================================================
-- BEHAVIOR RECORDS
-- ============================================================

create table if not exists public.behavior_records (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.students(id)
    on delete cascade,

  semester_id uuid not null
    references public.semesters(id)
    on delete cascade,

  category text,

  description text,

  score numeric(5,2),

  created_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid
    references public.profiles(id)
    on delete set null,

  action text not null,

  table_name text,

  record_id uuid,

  old_data jsonb,

  new_data jsonb,

  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_students_name
on public.students(full_name);

create index if not exists idx_students_nis
on public.students(nis);

create index if not exists idx_students_nisn
on public.students(nisn);

create index if not exists idx_student_classes_class
on public.student_classes(class_id);

create index if not exists idx_student_classes_year
on public.student_classes(academic_year_id);

create index if not exists idx_teacher_subjects_teacher
on public.teacher_subjects(teacher_id);

create index if not exists idx_teacher_subjects_class
on public.teacher_subjects(class_id);

create index if not exists idx_teacher_subjects_subject
on public.teacher_subjects(subject_id);

create index if not exists idx_grades_student
on public.grades(student_id);

create index if not exists idx_grades_teacher_subject
on public.grades(teacher_subject_id);

create index if not exists idx_grades_semester
on public.grades(semester_id);

create index if not exists idx_report_cards_student
on public.report_cards(student_id);

create index if not exists idx_audit_logs_user
on public.audit_logs(user_id);

create index if not exists idx_audit_logs_created
on public.audit_logs(created_at);

-- Active-period invariants are global: the application always has at most one
-- current year and at most one current semester.
create unique index if not exists uq_academic_years_one_active
on public.academic_years ((is_active)) where is_active;

create unique index if not exists uq_semesters_one_active
on public.semesters ((is_active)) where is_active;

-- ============================================================
-- UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists set_updated_at_school_settings on public.school_settings;
create trigger set_updated_at_school_settings before update on public.school_settings for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_academic_years on public.academic_years;
create trigger set_updated_at_academic_years before update on public.academic_years for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_teachers on public.teachers;
create trigger set_updated_at_teachers before update on public.teachers for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_students on public.students;
create trigger set_updated_at_students before update on public.students for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_classes on public.classes;
create trigger set_updated_at_classes before update on public.classes for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_subjects on public.subjects;
create trigger set_updated_at_subjects before update on public.subjects for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_grades on public.grades;
create trigger set_updated_at_grades before update on public.grades for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_grade_submissions on public.grade_submissions;
create trigger set_updated_at_grade_submissions before update on public.grade_submissions for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_report_cards on public.report_cards;
create trigger set_updated_at_report_cards before update on public.report_cards for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_attendance on public.attendance;
create trigger set_updated_at_attendance before update on public.attendance for each row execute function public.set_updated_at();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select id
  from public.teachers
  where profile_id = auth.uid()
  limit 1;
$$;

-- Authorization attributes may never be changed by the profile owner.
-- Role provisioning and account activation are trusted administrator operations.
create or replace function public.protect_profile_authorization()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if auth.uid() = old.id
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'Authorization attributes cannot be changed by the profile owner'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_authorization on public.profiles;
create trigger protect_profile_authorization
before update on public.profiles
for each row execute function public.protect_profile_authorization();

revoke all on function public.protect_profile_authorization() from public;

-- An active semester must belong to the active academic year. Together with
-- the partial unique indexes this also protects direct table writes.
create or replace function public.guard_active_semester()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if new.is_active and not exists (
    select 1 from public.academic_years ay
    where ay.id = new.academic_year_id and ay.is_active
  ) then
    raise exception 'Active semester must belong to the active academic year'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_active_semester on public.semesters;
create trigger guard_active_semester before insert or update on public.semesters
for each row execute function public.guard_active_semester();

create or replace function public.guard_active_academic_year()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if old.is_active and not new.is_active and exists (
    select 1 from public.semesters s
    where s.academic_year_id = old.id and s.is_active
  ) then
    raise exception 'Cannot deactivate academic year while its semester is active'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_active_academic_year on public.academic_years;
create trigger guard_active_academic_year before update of is_active on public.academic_years
for each row execute function public.guard_active_academic_year();

-- Cascading foreign keys are useful for empty setup data, but must never erase
-- historical/reporting records. These guards run before cascades are planned.
create or replace function public.guard_delete_academic_year()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if exists (select 1 from public.student_classes where academic_year_id = old.id)
     or exists (select 1 from public.teacher_subjects where academic_year_id = old.id)
     or exists (
       select 1 from public.semesters s where s.academic_year_id = old.id and (
         exists (select 1 from public.grades x where x.semester_id = s.id) or
         exists (select 1 from public.grade_submissions x where x.semester_id = s.id) or
         exists (select 1 from public.report_cards x where x.semester_id = s.id) or
         exists (select 1 from public.attendance x where x.semester_id = s.id) or
         exists (select 1 from public.student_extracurriculars x where x.semester_id = s.id) or
         exists (select 1 from public.achievements x where x.semester_id = s.id) or
         exists (select 1 from public.behavior_records x where x.semester_id = s.id)
       )
     ) then
    raise exception 'Cannot delete academic year with historical records' using errcode = '23503';
  end if;
  return old;
end;
$$;

create or replace function public.guard_delete_semester()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if exists (select 1 from public.grades where semester_id = old.id)
     or exists (select 1 from public.grade_submissions where semester_id = old.id)
     or exists (select 1 from public.report_cards where semester_id = old.id)
     or exists (select 1 from public.attendance where semester_id = old.id)
     or exists (select 1 from public.student_extracurriculars where semester_id = old.id)
     or exists (select 1 from public.achievements where semester_id = old.id)
     or exists (select 1 from public.behavior_records where semester_id = old.id) then
    raise exception 'Cannot delete semester with historical records' using errcode = '23503';
  end if;
  return old;
end;
$$;

drop trigger if exists guard_delete_academic_year on public.academic_years;
create trigger guard_delete_academic_year before delete on public.academic_years
for each row execute function public.guard_delete_academic_year();
drop trigger if exists guard_delete_semester on public.semesters;
create trigger guard_delete_semester before delete on public.semesters
for each row execute function public.guard_delete_semester();

create or replace function public.set_active_academic_period(
  target_year uuid,
  target_semester uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  semester_year uuid;
begin
  if public.current_user_role() is distinct from 'admin'::public.app_role then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;

  -- Serialize all activation calls, including calls selecting different rows.
  lock table public.academic_years in share row exclusive mode;
  lock table public.semesters in share row exclusive mode;

  perform 1 from public.academic_years where id = target_year for update;
  if not found then
    raise exception 'Academic year not found' using errcode = '22023';
  end if;

  if target_semester is not null then
    select academic_year_id into semester_year
    from public.semesters where id = target_semester for update;
    if not found then
      raise exception 'Semester not found' using errcode = '22023';
    end if;
    if semester_year <> target_year then
      raise exception 'Semester does not belong to academic year' using errcode = '22023';
    end if;
  end if;

  update public.semesters set is_active = false where is_active;
  update public.academic_years set is_active = false
    where is_active and id <> target_year;
  update public.academic_years set is_active = true
    where id = target_year and not is_active;
  if target_semester is not null then
    update public.semesters set is_active = true where id = target_semester;
  end if;
end;
$$;

revoke all on function public.guard_active_semester() from public;
revoke all on function public.guard_active_academic_year() from public;
revoke all on function public.guard_delete_academic_year() from public;
revoke all on function public.guard_delete_semester() from public;
revoke all on function public.set_active_academic_period(uuid, uuid) from public;
revoke all on function public.set_active_academic_period(uuid, uuid) from anon;
grant execute on function public.set_active_academic_period(uuid, uuid) to authenticated;

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.school_settings enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.classes enable row level security;
alter table public.student_classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.assessment_types enable row level security;
alter table public.grades enable row level security;
alter table public.grade_submissions enable row level security;
alter table public.report_cards enable row level security;
alter table public.attendance enable row level security;
alter table public.extracurriculars enable row level security;
alter table public.student_extracurriculars enable row level security;
alter table public.achievements enable row level security;
alter table public.behavior_records enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- ADMIN POLICIES
-- ============================================================

create policy "admin_all_school_settings" on public.school_settings for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_academic_years" on public.academic_years for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_semesters" on public.semesters for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_teachers" on public.teachers for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_students" on public.students for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_classes" on public.classes for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_student_classes" on public.student_classes for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_subjects" on public.subjects for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_teacher_subjects" on public.teacher_subjects for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_assessment_types" on public.assessment_types for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_grades" on public.grades for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_grade_submissions" on public.grade_submissions for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_report_cards" on public.report_cards for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_profiles" on public.profiles for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_attendance" on public.attendance for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_extracurriculars" on public.extracurriculars for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_student_extracurriculars" on public.student_extracurriculars for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_achievements" on public.achievements for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admin_all_behavior_records" on public.behavior_records for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- ============================================================
-- AUTHENTICATED READ POLICIES
-- ============================================================

create policy "authenticated_read_academic_years" on public.academic_years for select to authenticated using (true);
create policy "authenticated_read_semesters" on public.semesters for select to authenticated using (true);
create policy "authenticated_read_subjects" on public.subjects for select to authenticated using (true);
create policy "authenticated_read_assessment_types" on public.assessment_types for select to authenticated using (true);

-- ============================================================
-- TEACHER ASSIGNMENT ACCESS
-- ============================================================

create policy "teacher_read_own_assignments" on public.teacher_subjects for select to authenticated using (current_user_role() in ('teacher', 'homeroom_teacher') and teacher_id = current_teacher_id());

-- ============================================================
-- TEACHER GRADE ACCESS
-- ============================================================

create policy "teacher_read_own_grades" on public.grades for select to authenticated using (teacher_subject_id in (select id from public.teacher_subjects where teacher_id = current_teacher_id()));

create policy "teacher_insert_own_grades" on public.grades for insert to authenticated with check (current_user_role() = 'teacher' and status = 'draft' and teacher_subject_id in (select id from public.teacher_subjects where teacher_id = current_teacher_id()));

create policy "teacher_update_own_grades" on public.grades for update to authenticated using (current_user_role() = 'teacher' and teacher_subject_id in (select id from public.teacher_subjects where teacher_id = current_teacher_id()) and status = 'draft') with check (current_user_role() = 'teacher' and status = 'draft' and teacher_subject_id in (select id from public.teacher_subjects where teacher_id = current_teacher_id()));

-- ============================================================
-- TEACHER READ STUDENTS
-- ============================================================

create policy "teacher_read_assigned_students" on public.students for select to authenticated using (current_user_role() = 'teacher' and id in (select sc.student_id from public.student_classes sc where sc.class_id in (select ts.class_id from public.teacher_subjects ts where ts.teacher_id = current_teacher_id())));

-- ============================================================
-- HOMEROOM ACCESS
-- ============================================================

create policy "homeroom_read_own_class" on public.classes for select to authenticated using (current_user_role() = 'homeroom_teacher' and homeroom_teacher_id = current_teacher_id());

create policy "homeroom_read_students" on public.students for select to authenticated using (current_user_role() = 'homeroom_teacher' and id in (select sc.student_id from public.student_classes sc where sc.class_id in (select c.id from public.classes c where c.homeroom_teacher_id = current_teacher_id())));

create policy "homeroom_read_student_classes" on public.student_classes for select to authenticated using (current_user_role() = 'homeroom_teacher' and class_id in (select id from public.classes where homeroom_teacher_id = current_teacher_id()));

create policy "homeroom_read_grades" on public.grades for select to authenticated using (current_user_role() = 'homeroom_teacher' and student_id in (select sc.student_id from public.student_classes sc where sc.class_id in (select c.id from public.classes c where c.homeroom_teacher_id = current_teacher_id())));

-- ============================================================
-- PROFILE POLICY
-- ============================================================

create policy "users_read_own_profile" on public.profiles for select to authenticated using (id = auth.uid());

create policy "users_update_own_profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================
-- AUDIT LOG
-- ============================================================

create policy "admin_read_audit_logs" on public.audit_logs for select to authenticated using (current_user_role() = 'admin');

-- Helper functions are internal to authenticated RLS evaluation.
revoke all on function public.current_user_role() from public;
revoke all on function public.current_teacher_id() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_teacher_id() to authenticated;

-- ============================================================
-- DEFAULT DATA
-- ============================================================

insert into public.school_settings (school_name, school_address, ranking_enabled)
select 'Nama Sekolah', 'Alamat Sekolah', true where not exists (select 1 from public.school_settings);

insert into public.assessment_types (name, code, weight)
values ('Tugas', 'TUGAS', 30), ('PTS', 'PTS', 30), ('PAS', 'PAS', 40)
on conflict (code) do nothing;

commit;
