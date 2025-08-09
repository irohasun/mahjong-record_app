-- Create public bucket for game photos if not exists
insert into storage.buckets (id, name, public)
values ('game-photos', 'game-photos', true)
on conflict (id) do nothing;

-- Policies: Public read, authenticated write limited to own folder
-- Enable RLS
alter table storage.objects enable row level security;

-- Public can read photos in game-photos bucket
create policy if not exists "Public read game photos"
on storage.objects for select
using (bucket_id = 'game-photos');

-- Authenticated users can upload/update/delete only within games/<uid>/ prefix
create policy if not exists "Users can insert their own game photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'game-photos'
  and (split_part(name, '/', 1) = 'games')
  and (split_part(name, '/', 2) = auth.uid()::text)
);

create policy if not exists "Users can update their own game photos"
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

create policy if not exists "Users can delete their own game photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'game-photos'
  and (split_part(name, '/', 1) = 'games')
  and (split_part(name, '/', 2) = auth.uid()::text)
);


