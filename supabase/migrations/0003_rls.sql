-- Lock down all app tables. authenticated (office staff) get full access; anon gets none
-- (workers/viewers reach data only through the SECURITY DEFINER RPCs in 0004).

alter table customers            enable row level security;
alter table work_type_templates  enable row level security;
alter table work_orders          enable row level security;
alter table containers           enable row level security;
alter table photos               enable row level security;
alter table share_links          enable row level security;
alter table publications         enable row level security;
alter table audit_logs           enable row level security;

create policy auth_all_customers   on customers           for all to authenticated using (true) with check (true);
create policy auth_all_templates   on work_type_templates for all to authenticated using (true) with check (true);
create policy auth_all_workorders  on work_orders         for all to authenticated using (true) with check (true);
create policy auth_all_containers  on containers          for all to authenticated using (true) with check (true);
create policy auth_all_photos      on photos              for all to authenticated using (true) with check (true);
create policy auth_all_sharelinks  on share_links         for all to authenticated using (true) with check (true);
create policy auth_all_pubs        on publications        for all to authenticated using (true) with check (true);
create policy auth_all_audit       on audit_logs          for all to authenticated using (true) with check (true);

-- record the creating office user for audit
alter table work_orders alter column created_by set default auth.uid();
