-- Idempotent fictional demo seed for supabase/migrations/001_initial_schema.sql ONLY.
-- Run as postgres (for example via `supabase db reset`), never from a client.
-- This file creates no passwords, auth users, identities, or service keys.
--
-- REQUIRED AUTH MAPPING (six fixed slots)
-- 1. Create/invite the six users in Dashboard > Authentication > Users (or with
--    a trusted server-side Auth Admin API).
-- 2. Replace ONLY the six placeholder UUIDs below with their actual auth.users IDs.
-- 3. Rerun this seed. Profiles/teachers are created only when that auth user exists.
-- Keep mappings stable: an existing mismatched profile/teacher causes a safe failure.

begin;
select pg_advisory_xact_lock(20260911, 1);

create temporary table seed_staff (
  slot integer primary key, auth_id uuid not null unique, full_name text not null,
  role public.app_role not null
) on commit drop;
insert into seed_staff values
  (1, 'de000001-0000-4000-8000-000000000001', 'Ratna Puspitasari', 'admin'),
  (2, 'de000001-0000-4000-8000-000000000002', 'Budi Santoso', 'teacher'),
  (3, 'de000001-0000-4000-8000-000000000003', 'Siti Nurhayati', 'teacher'),
  (4, 'de000001-0000-4000-8000-000000000004', 'Agus Prasetyo', 'teacher'),
  (5, 'de000001-0000-4000-8000-000000000005', 'Dewi Lestari', 'homeroom_teacher'),
  (6, 'de000001-0000-4000-8000-000000000006', 'Rizky Setiawan', 'homeroom_teacher');

do $$
declare
  s record; x record; i integer; j integer; k integer;
  v_year uuid := md5('e-raport-demo:year:2026/2027')::uuid;
  v_sem_g uuid := md5('e-raport-demo:semester:ganjil')::uuid;
  v_sem_e uuid := md5('e-raport-demo:semester:genap')::uuid;
  v_id uuid; v_class uuid; v_teacher uuid; v_assignment uuid;
  v_missing integer;
begin
  select count(*) into v_missing from seed_staff staff_row
  where not exists (select 1 from auth.users u where u.id = staff_row.auth_id);
  if v_missing > 0 then
    raise notice 'Demo seed: % of 6 mapped Auth users are absent; their profiles/teachers and dependent rows are skipped.', v_missing;
  end if;

  -- Never attach demo identities to an existing, differently defined profile.
  for s in select ss.* from seed_staff ss join auth.users u on u.id = ss.auth_id loop
    if exists (select 1 from public.profiles p where p.id=s.auth_id and
      (p.full_name is distinct from s.full_name or p.role is distinct from s.role)) then
      raise exception 'Profile % conflicts with reviewed demo mapping', s.auth_id;
    end if;
    insert into public.profiles(id,full_name,role)
    values(s.auth_id,s.full_name,s.role) on conflict(id) do nothing;

    if s.slot > 1 then
      v_id := md5('e-raport-demo:teacher:'||s.slot)::uuid;
      if exists (select 1 from public.teachers where id=v_id and
        (profile_id is distinct from s.auth_id or full_name is distinct from s.full_name))
        or exists (select 1 from public.teachers where profile_id=s.auth_id and id<>v_id)
        or exists (select 1 from public.teachers where nip='DEMO-GURU-'||lpad((s.slot-1)::text,3,'0') and id<>v_id) then
        raise exception 'Teacher slot % conflicts with existing teacher data', s.slot;
      end if;
      insert into public.teachers(id,profile_id,nip,full_name,email)
      values(v_id,s.auth_id,'DEMO-GURU-'||lpad((s.slot-1)::text,3,'0'),s.full_name,null)
      on conflict(id) do nothing;
    end if;
  end loop;

  -- The migration creates one placeholder row. Update only that untouched placeholder;
  -- otherwise preserve every existing school row. On an empty DB use a deterministic ID.
  update public.school_settings set school_name='SMP Harapan Nusantara (Demo)',
    school_address='Jalan Melati No. 12, Yogyakarta (alamat fiktif)', principal_name='Sri Wahyuni'
  where school_name='Nama Sekolah' and school_address='Alamat Sekolah'
    and school_npsn is null and school_phone is null and school_email is null
    and school_website is null and principal_name is null and principal_nip is null and logo_url is null;
  if not exists(select 1 from public.school_settings) then
    insert into public.school_settings(id,school_name,school_address,principal_name)
    values(md5('e-raport-demo:school')::uuid,'SMP Harapan Nusantara (Demo)',
      'Jalan Melati No. 12, Yogyakarta (alamat fiktif)','Sri Wahyuni');
  end if;

  if exists(select 1 from public.academic_years where name='2026/2027' and id<>v_year) then
    raise exception 'Academic year natural key 2026/2027 is owned by non-demo data';
  end if;
  insert into public.academic_years(id,name,start_date,end_date,is_active)
  values(v_year,'2026/2027','2026-07-13','2027-06-25',false) on conflict(id) do nothing;
  insert into public.semesters(id,academic_year_id,name,is_active) values
    (v_sem_g,v_year,'ganjil',false),(v_sem_e,v_year,'genap',false) on conflict(id) do nothing;

  -- Classes are deliberately year-agnostic in the initial schema.
  for i in 1..3 loop
    v_id:=md5('e-raport-demo:class:'||i)::uuid;
    v_teacher:=null;
    if i<=2 then
      select t.id into v_teacher from public.teachers t join seed_staff ss on ss.auth_id=t.profile_id
      where ss.slot=i+4 and t.id=md5('e-raport-demo:teacher:'||(i+4))::uuid;
    end if;
    if exists(select 1 from public.classes where id=v_id and
      (name is distinct from 'VII-'||chr(64+i) or grade_level<>7)) then
      raise exception 'Demo class UUID % conflicts with existing data',v_id;
    end if;
    insert into public.classes(id,name,grade_level,homeroom_teacher_id)
    values(v_id,'VII-'||chr(64+i),7,v_teacher) on conflict(id) do nothing;
    update public.classes set homeroom_teacher_id=v_teacher
      where id=v_id and homeroom_teacher_id is null and v_teacher is not null;
  end loop;

  for x in select * from (values
    (1,'Aditya Pratama','L'),(2,'Aisyah Putri','P'),(3,'Bagas Saputra','L'),(4,'Citra Maharani','P'),
    (5,'Daffa Ramadhan','L'),(6,'Dinda Kirana','P'),(7,'Fajar Nugroho','L'),(8,'Farah Azzahra','P'),
    (9,'Galang Pamungkas','L'),(10,'Gita Permatasari','P'),(11,'Hafiz Maulana','L'),(12,'Hana Safitri','P'),
    (13,'Ilham Firmansyah','L'),(14,'Intan Wulandari','P'),(15,'Jihan Amalia','P'),(16,'Kevin Kurniawan','L'),
    (17,'Laila Rahmawati','P'),(18,'Lintang Wicaksono','L'),(19,'Maya Anggraini','P'),(20,'Muhammad Farhan','L'),
    (21,'Nabila Zahra','P'),(22,'Naufal Hidayat','L'),(23,'Olivia Kartika','P'),(24,'Putra Mahendra','L'),
    (25,'Qonita Salma','P'),(26,'Rafi Alfarizi','L'),(27,'Salma Febriani','P'),(28,'Tegar Laksono','L'),
    (29,'Vina Oktaviani','P'),(30,'Yoga Saputro','L')) n(n,name,gender) loop
    v_id:=md5('e-raport-demo:student:'||x.n)::uuid;
    if exists(select 1 from public.students where (nis='D26'||lpad(x.n::text,4,'0') or nisn='009900'||lpad(x.n::text,4,'0')) and id<>v_id) then
      raise exception 'Demo student natural key % conflicts with production data',x.n;
    end if;
    insert into public.students(id,nis,nisn,full_name,gender,birth_place,birth_date)
    values(v_id,'D26'||lpad(x.n::text,4,'0'),'009900'||lpad(x.n::text,4,'0'),x.name,x.gender::public.gender_type,
      'Yogyakarta',date '2013-01-10'+x.n*9) on conflict(id) do nothing;
    v_class:=md5('e-raport-demo:class:'||(((x.n-1)/10)+1))::uuid;
    insert into public.student_classes(id,student_id,class_id,academic_year_id)
    values(md5('e-raport-demo:enrollment:'||x.n)::uuid,v_id,v_class,v_year)
    on conflict(id) do nothing;
  end loop;

  for x in select * from (values
    (1,'PAI','Pendidikan Agama Islam dan Budi Pekerti'),(2,'PP','Pendidikan Pancasila'),
    (3,'BIN','Bahasa Indonesia'),(4,'MAT','Matematika'),(5,'IPA','Ilmu Pengetahuan Alam'),
    (6,'IPS','Ilmu Pengetahuan Sosial'),(7,'BIG','Bahasa Inggris'),
    (8,'PJOK','Pendidikan Jasmani, Olahraga, dan Kesehatan'),(9,'INF','Informatika'),(10,'SB','Seni Budaya')) q(n,code,name) loop
    v_id:=md5('e-raport-demo:subject:'||x.n)::uuid;
    if exists(select 1 from public.subjects where code=x.code and id<>v_id) then
      raise exception 'Subject code % is owned by non-demo data',x.code;
    end if;
    insert into public.subjects(id,code,name,group_name,minimum_score)
    values(v_id,x.code,x.name,'Kelas VII',75) on conflict(id) do nothing;

    select t.id into v_teacher from public.teachers t join seed_staff ss on ss.auth_id=t.profile_id
      where ss.slot=2+(x.n-1)%3 and t.id=md5('e-raport-demo:teacher:'||(2+(x.n-1)%3))::uuid;
    if v_teacher is not null then
      for i in 1..3 loop
        v_assignment:=md5('e-raport-demo:assignment:'||i||':'||x.n)::uuid;
        insert into public.teacher_subjects(id,teacher_id,subject_id,class_id,academic_year_id)
        values(v_assignment,v_teacher,v_id,md5('e-raport-demo:class:'||i)::uuid,v_year)
        on conflict(id) do nothing;
        insert into public.grade_submissions(id,teacher_subject_id,semester_id,status)
        values(md5('e-raport-demo:submission:'||i||':'||x.n)::uuid,v_assignment,v_sem_g,'draft')
        on conflict(id) do nothing;
        -- Three incomplete, draft TUGAS grades per assignment (90 when all teachers exist).
        for k in 1..3 loop
          insert into public.grades(id,student_id,teacher_subject_id,assessment_type_id,semester_id,score,notes,status)
          select md5('e-raport-demo:grade:'||i||':'||x.n||':'||k)::uuid,
            md5('e-raport-demo:student:'||((i-1)*10+k))::uuid,v_assignment,a.id,v_sem_g,
            70+((i*3+x.n*2+k*5)%26),'Nilai latihan fiktif; belum diajukan.','draft'
          from public.assessment_types a where a.code='TUGAS'
          on conflict(id) do nothing;
        end loop;
      end loop;
    end if;
  end loop;

  -- Keep and use the migration's global defaults; reject altered definitions.
  if (select count(*) from public.assessment_types where
      (code='TUGAS' and name='Tugas' and weight=30) or
      (code='PTS' and name='PTS' and weight=30) or
      (code='PAS' and name='PAS' and weight=40)) <> 3 then
    raise exception 'Global TUGAS/PTS/PAS definitions differ from 001_initial_schema.sql';
  end if;

  -- Assertions are scoped exclusively to deterministic demo IDs.
  if (select count(*) from public.students where id in
      (select md5('e-raport-demo:student:'||g)::uuid from generate_series(1,30) g))<>30
    or (select count(*) from public.student_classes where academic_year_id=v_year and id in
      (select md5('e-raport-demo:enrollment:'||g)::uuid from generate_series(1,30) g))<>30
    or (select count(*) from public.subjects where id in
      (select md5('e-raport-demo:subject:'||g)::uuid from generate_series(1,10) g))<>10 then
    raise exception 'Demo seed count verification failed';
  end if;
end $$;

commit;

-- Optional verification (returns provision-dependent counts for assignments/submissions/grades):
select
  (select count(*) from public.classes where id in (select md5('e-raport-demo:class:'||g)::uuid from generate_series(1,3) g)) as demo_classes,
  (select count(*) from public.students where id in (select md5('e-raport-demo:student:'||g)::uuid from generate_series(1,30) g)) as demo_students,
  (select count(*) from public.student_classes where academic_year_id=md5('e-raport-demo:year:2026/2027')::uuid) as demo_enrollments,
  (select count(*) from public.subjects where id in (select md5('e-raport-demo:subject:'||g)::uuid from generate_series(1,10) g)) as demo_subjects,
  (select count(*) from public.teacher_subjects where academic_year_id=md5('e-raport-demo:year:2026/2027')::uuid) as demo_assignments,
  (select count(*) from public.grade_submissions where semester_id=md5('e-raport-demo:semester:ganjil')::uuid) as demo_draft_submissions,
  (select count(*) from public.grades where semester_id=md5('e-raport-demo:semester:ganjil')::uuid) as demo_sample_grades;
