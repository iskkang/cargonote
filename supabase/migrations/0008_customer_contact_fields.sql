-- Add structured contact fields to customers (non-destructive; keeps legacy contact/notes)
alter table customers add column if not exists contact_name text;
alter table customers add column if not exists phone text;
alter table customers add column if not exists email text;
