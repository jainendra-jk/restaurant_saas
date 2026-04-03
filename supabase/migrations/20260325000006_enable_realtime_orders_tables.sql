do $$
begin
  -- Ensure Realtime publication exists (created by Supabase). If missing, fail loudly.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Publication supabase_realtime does not exist';
  end if;

  -- Add public.orders to Realtime publication if not already present
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  -- Add public.tables to Realtime publication if not already present
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'tables'
  ) then
    alter publication supabase_realtime add table public.tables;
  end if;
end
$$;

