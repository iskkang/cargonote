-- Persist the load-calculator plan a job was created from (display-only context).
alter table work_orders
  add column if not exists planned_container_type text,
  add column if not exists planned_container_count int;
