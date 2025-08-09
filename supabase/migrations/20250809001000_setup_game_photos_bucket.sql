-- Create public bucket for game photos if not exists
insert into storage.buckets (id, name, public)
values ('game-photos', 'game-photos', true)
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


