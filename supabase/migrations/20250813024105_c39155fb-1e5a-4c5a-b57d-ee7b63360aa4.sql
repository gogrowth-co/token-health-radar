
-- 1) Ensure a public bucket for score snapshots
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do nothing;

-- 2) Allow public read access to objects in the "reports" bucket
-- RLS on storage.objects is enabled by default; without a SELECT policy, nothing is readable.
create policy "Public read access for reports bucket"
on storage.objects
for select
using (bucket_id = 'reports');
