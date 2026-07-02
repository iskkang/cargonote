-- Create the `captures` storage bucket in code so a fresh/rebuilt project has it.
-- Originally created by hand in the Supabase dashboard (Plan A); a project set up
-- by applying migrations only would have the policies (0005/0006) but NO bucket,
-- so worker/spike uploads fail with "Bucket not found".
-- Idempotent: does nothing if the bucket already exists.
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;
