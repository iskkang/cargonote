-- Assignee email on work orders, prefilled from the selected customer.
alter table work_orders add column if not exists assignee_email text;
