-- Simple fixed-window-lookback rate limiter backed by rate_limit_hits.
-- Returns true (and records a hit) if the caller is under
-- p_max_requests within the trailing p_window_seconds; returns false
-- (records nothing) if they're over. Self-cleaning: each call first prunes
-- hits older than the window, so the table never grows unbounded and no
-- separate cleanup job is needed.
create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.rate_limit_hits
    where created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*) into v_count
  from public.rate_limit_hits
  where user_id = p_user_id
    and endpoint = p_endpoint
    and created_at >= now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_requests then
    return false;
  end if;

  insert into public.rate_limit_hits (user_id, endpoint) values (p_user_id, p_endpoint);
  return true;
end;
$$;

revoke all on function public.check_rate_limit from public, anon, authenticated;
grant execute on function public.check_rate_limit to service_role;
