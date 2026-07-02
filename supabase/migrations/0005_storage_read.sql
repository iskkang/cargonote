-- Office (authenticated) can read/download captured photos (review + gallery).
-- Worker upload keeps the existing anon INSERT policy on the captures bucket.
-- NOTE: storage schema is absent under PGlite; this migration is applied live only.
create policy "authenticated read captures"
  on storage.objects for select to authenticated
  using (bucket_id = 'captures');
