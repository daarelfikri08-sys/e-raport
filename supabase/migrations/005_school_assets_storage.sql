-- ============================================================
-- MIGRATION 005: SCHOOL ASSETS STORAGE
-- Bucket pubic untuk logo/kop surat sekolah.
-- Hanya aktif bila schema `storage` tersedia (Supabase).
-- Di lingkungan tanpa schema storage (misal harness PGlite)
-- blok ini menjadi no-op sehingga aman dijalankan di mana pun.
-- ============================================================

begin;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('school-assets', 'school-assets', true)
    on conflict (id) do nothing;

    drop policy if exists "school_assets_public_read" on storage.objects;
    create policy "school_assets_public_read"
      on storage.objects for select
      using (bucket_id = 'school-assets');

    drop policy if exists "school_assets_auth_insert" on storage.objects;
    create policy "school_assets_auth_insert"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'school-assets');

    drop policy if exists "school_assets_auth_update" on storage.objects;
    create policy "school_assets_auth_update"
      on storage.objects for update to authenticated
      using (bucket_id = 'school-assets');

    raise notice 'storage bucket school-assets siap.';
  else
    raise notice 'storage schema tidak ditemukan; lewati pembuatan bucket.';
  end if;
end $$;

commit;