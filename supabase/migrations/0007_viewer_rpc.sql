-- Anon recipients read a published gallery ONLY through this token-validating SECURITY DEFINER function.
create or replace function viewer_bootstrap(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_link share_links; v_manifest jsonb;
begin
  select * into v_link from share_links
    where token = p_token and kind = 'viewer' and revoked = false
      and (expires_at is null or expires_at > now())
    limit 1;
  if not found then return null; end if;

  select photo_manifest into v_manifest from publications
    where work_order_id = v_link.work_order_id
    order by published_at desc
    limit 1;

  return v_manifest; -- null if never published
end $$;

revoke all on function viewer_bootstrap(text) from public;
grant execute on function viewer_bootstrap(text) to anon, authenticated;
