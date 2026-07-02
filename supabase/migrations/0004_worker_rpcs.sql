-- Anon workers/viewers reach data ONLY through these token-validating SECURITY DEFINER functions.
-- They run as owner (bypass RLS) but enforce the share-link token themselves.

create or replace function worker_bootstrap(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_link share_links; v_order work_orders; v_template jsonb; v_containers jsonb;
begin
  select * into v_link from share_links
    where token = p_token and kind = 'worker' and revoked = false
      and (expires_at is null or expires_at > now())
    limit 1;
  if not found then return null; end if;

  select * into v_order from work_orders where id = v_link.work_order_id;
  if not found then return null; end if;

  select to_jsonb(t) into v_template from work_type_templates t where t.id = v_order.template_id;
  if v_template is null then return null; end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb) into v_containers
    from containers c where c.work_order_id = v_order.id;

  return jsonb_build_object('order', to_jsonb(v_order), 'template', v_template, 'containers', v_containers);
end $$;

create or replace function worker_insert_photo(
  p_token text, p_container_id uuid, p_slot_key text,
  p_display_path text, p_thumb_path text, p_file_hash text, p_byte_size int, p_captured_at timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare v_wo uuid;
begin
  select work_order_id into v_wo from share_links
    where token = p_token and kind = 'worker' and revoked = false
      and (expires_at is null or expires_at > now())
    limit 1;
  if v_wo is null then raise exception 'invalid token'; end if;
  if not exists (select 1 from containers where id = p_container_id and work_order_id = v_wo) then
    raise exception 'container not in work order';
  end if;
  insert into photos (container_id, slot_key, display_path, thumb_path, file_hash, byte_size, captured_at, status)
  values (p_container_id, p_slot_key, p_display_path, p_thumb_path, p_file_hash, p_byte_size, p_captured_at, 'uploaded');
end $$;

create or replace function worker_list_photos(p_token text, p_container_id uuid)
returns setof photos language plpgsql security definer set search_path = public as $$
declare v_wo uuid;
begin
  select work_order_id into v_wo from share_links
    where token = p_token and kind = 'worker' and revoked = false
      and (expires_at is null or expires_at > now())
    limit 1;
  if v_wo is null then raise exception 'invalid token'; end if;
  if not exists (select 1 from containers where id = p_container_id and work_order_id = v_wo) then
    raise exception 'container not in work order';
  end if;
  return query select * from photos where container_id = p_container_id order by created_at;
end $$;

revoke all on function worker_bootstrap(text) from public;
revoke all on function worker_insert_photo(text, uuid, text, text, text, text, int, timestamptz) from public;
revoke all on function worker_list_photos(text, uuid) from public;
grant execute on function worker_bootstrap(text) to anon, authenticated;
grant execute on function worker_insert_photo(text, uuid, text, text, text, text, int, timestamptz) to anon, authenticated;
grant execute on function worker_list_photos(text, uuid) to anon, authenticated;
