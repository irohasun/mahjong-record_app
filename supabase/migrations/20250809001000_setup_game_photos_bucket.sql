-- Supabase Storage v3 以降では storage.buckets に public 列が存在しないため、
-- id/name のみを指定してバケットを作成し、公開可否はRLSポリシーで制御します。
insert into storage.buckets (id, name)
values ('game-photos', 'game-photos')
on conflict (id) do nothing;

-- Policies: Public read, authenticated write limited to own folder
-- Note: RLS on storage.objects is enabled by default in Supabase. Create policies idempotently.

do $$ begin
  create policy "Public read game photos"
  on storage.objects for select
  using (bucket_id = 'game-photos');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert their own game photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'game-photos'
    and (split_part(name, '/', 1) = 'games')
    and (split_part(name, '/', 2) = auth.uid()::text)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own game photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'game-photos'
    and (split_part(name, '/', 1) = 'games')
    and (split_part(name, '/', 2) = auth.uid()::text)
  )
  with check (
    bucket_id = 'game-photos'
    and (split_part(name, '/', 1) = 'games')
    and (split_part(name, '/', 2) = auth.uid()::text)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete their own game photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'game-photos'
    and (split_part(name, '/', 1) = 'games')
    and (split_part(name, '/', 2) = auth.uid()::text)
  );
exception when duplicate_object then null; end $$;

-- Supabase Storage v3 以降に合わせ、public 列は使用しない
insert into storage.buckets (id, name)
values ('profile-photos', 'profile-photos')
on conflict (id) do nothing;

do $$ begin
  create policy "Public read profile photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can upsert their own profile photos"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'profile-photos'
    and (split_part(name, '/', 1) = 'avatars')
    and (split_part(name, '/', 2) = auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-photos'
    and (split_part(name, '/', 1) = 'avatars')
    and (split_part(name, '/', 2) = auth.uid()::text)
  );
exception when duplicate_object then null; end $$;
