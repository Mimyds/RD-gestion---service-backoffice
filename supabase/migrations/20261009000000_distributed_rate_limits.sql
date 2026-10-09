-- Shared, atomic API rate limits. The table is inaccessible directly; authenticated
-- callers can only consume their own bucket through take_rate_limit().
create table public.rate_limit_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  count integer not null check (count > 0),
  reset_at timestamptz not null,
  primary key (user_id, scope)
);

alter table public.rate_limit_buckets enable row level security;

create or replace function public.take_rate_limit(p_scope text, p_limit integer, p_window_ms integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_time timestamptz := clock_timestamp();
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

  if not found or bucket_reset <= current_time then
    insert into public.rate_limit_buckets (user_id, scope, count, reset_at)
    values (current_user_id, p_scope, 1, current_time + make_interval(secs => p_window_ms / 1000.0))
    on conflict (user_id, scope) do update set count = 1, reset_at = excluded.reset_at;
    return query select true, 0;
    return;
  end if;

  update public.rate_limit_buckets set count = count + 1
  where user_id = current_user_id and scope = p_scope;
  return query select bucket_count + 1 <= p_limit,
    greatest(1, ceil(extract(epoch from (bucket_reset - current_time)))::integer);
end;
$$;

revoke all on table public.rate_limit_buckets from anon, authenticated;
revoke all on function public.take_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.take_rate_limit(text, integer, integer) to authenticated;
