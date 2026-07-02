-- Codify the anon INSERT policy on the `captures` bucket so a fresh/rebuilt project
-- reproduces worker + spike upload access. This was originally created by hand in the
-- Supabase dashboard during Plan A ("spike anon insert"), so it lived only in the live
-- project, not in code — a `db reset` or new environment would silently break uploads.
--
-- The name here differs from the manual policy, so applying this on the existing live
-- project is additive and harmless (both permit the same anon INSERT). On a fresh project
-- this is the policy that grants worker/spike upload.
--
-- Path is NOT restricted beyond the bucket (matches current behaviour); per-token signed
-- uploads are a documented follow-up (Plan C.2/E).
create policy "anon insert captures (codified)"
  on storage.objects for insert to anon
  with check (bucket_id = 'captures');
