-- Allow authenticated (office staff) to upload to `captures`, not just anon workers.
-- Real field workers are anon (token link, no login) and covered by 0006. But an admin
-- previewing/testing a worker link while logged in uploads as `authenticated`, which had
-- only SELECT (0005) and no INSERT -> "new row violates row-level security policy".
-- Office staff are trusted, so granting them INSERT to captures is safe.
create policy "authenticated insert captures"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'captures');
