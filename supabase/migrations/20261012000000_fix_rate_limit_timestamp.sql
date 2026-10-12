-- Avoid the reserved SQL expression CURRENT_TIME being resolved instead of the
-- PL/pgSQL variable, which caused timestamptz/time comparisons to fail at runtime.
create or replace function public.take_rate_limit(p_scope text, p_limit integer, p_window_ms integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  checked_at timestamptz := clock_timestamp();
  bucket_count integer;
  bucket_reset timestamptz;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if p_scope !~ '^[a-z][a-z0-9:_-]{0,79}$' or p_limit < 1 or p_limit > 10000 or p_window_ms < 1000 or p_window_ms > 86400000 then
    raise exception 'invalid rate limit parameters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':' || p_scope, 0));
  select count, reset_at into bucket_count, bucket_reset
  from public.rate_limit_buckets
  where user_id = current_user_id and scope = p_scope;

  if not found or bucket_reset <= checked_at then
    insert into public.rate_limit_buckets (user_id, scope, count, reset_at)
    values (current_user_id, p_scope, 1, checked_at + make_interval(secs => p_window_ms / 1000.0))
    on conflict (user_id, scope) do update set count = 1, reset_at = excluded.reset_at;
    return query select true, 0;
    return;
  end if;

  update public.rate_limit_buckets set count = count + 1
  where user_id = current_user_id and scope = p_scope;
  return query select bucket_count + 1 <= p_limit,
    greatest(1, ceil(extract(epoch from (bucket_reset - checked_at)))::integer);
end;
$$;
