-- Phase 1 core schema (no RLS; RLS is applied at Supabase-connect time)

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  notes text,
  created_at timestamptz not null default now()
);

create table work_type_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  carrier text,
  route text,
  anchor_type text not null,
  required_photos jsonb not null default '[]'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  min_count int not null default 0,
  warning_text text,
  ocr_targets jsonb not null default '[]'::jsonb,
  tag_set jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  template_id uuid not null references work_type_templates(id),
  work_date date,
  status text not null default 'draft'
    check (status in ('draft','sent','in_progress','submitted','published')),
  assignee_name text,
  assignee_contact text,
  shipper_label text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table containers (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  container_no text not null,
  seal_no text,
  worker_memo text,
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references containers(id) on delete cascade,
  slot_key text,
  original_path text,
  display_path text,
  thumb_path text,
  file_hash text not null,
  byte_size int,
  captured_at timestamptz,
  gps_lat double precision,
  gps_lng double precision,
  status text not null default 'uploaded' check (status in ('uploaded','soft_deleted')),
  created_at timestamptz not null default now()
);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  token text not null unique,
  kind text not null check (kind in ('worker','viewer')),
  revoked boolean not null default false,
  expires_at timestamptz,
  password_hash text,
  created_at timestamptz not null default now()
);

create table publications (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  published_at timestamptz not null default now(),
  published_by uuid,
  viewer_token text,
  photo_manifest jsonb not null default '[]'::jsonb
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_work_orders_customer on work_orders(customer_id);
create index idx_work_orders_status on work_orders(status);
create index idx_containers_work_order on containers(work_order_id);
create index idx_photos_container on photos(container_id);
create index idx_photos_container_slot on photos(container_id, slot_key);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
