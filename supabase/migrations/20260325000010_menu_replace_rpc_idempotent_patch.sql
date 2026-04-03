-- Patch migration: idempotent category upsert for replace_menu_config
-- Safe to apply as a new migration without modifying already-applied history.

create or replace function public.replace_menu_config(
  p_restaurant_id uuid,
  p_menu jsonb,
  p_palette jsonb default null,
  p_currency text default null,
  p_branding jsonb default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  dup_item_slug text;
  categories_total_count int := 0;
  categories_upserted_count int := 0;
  conflicts_handled_count int := 0;
  stale_categories_deleted_count int := 0;
  category_ids jsonb := '{}'::jsonb;
begin
  if not public.is_staff_of(p_restaurant_id) then
    raise exception 'not authorized';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text, 0));

  if p_menu is null or jsonb_typeof(p_menu) <> 'object' then
    raise exception 'Invalid menu payload';
  end if;

  if p_menu->'categories' is null or jsonb_typeof(p_menu->'categories') <> 'array' or jsonb_array_length(p_menu->'categories') = 0 then
    raise exception 'No categories to save';
  end if;

  select (ii.cat_slug || ':' || ii.slug) into dup_item_slug
  from (
    select
      (c->>'id') as cat_slug,
      (it->>'id') as slug
    from jsonb_array_elements(p_menu->'categories') as c
    cross join lateral jsonb_array_elements(coalesce(c->'items', '[]'::jsonb)) as it
  ) as ii
  where ii.slug is not null and btrim(ii.slug) <> ''
  group by ii.cat_slug, ii.slug
  having count(*) > 1
  limit 1;

  if dup_item_slug is not null then
    raise exception 'Duplicate item slug in payload: %', dup_item_slug;
  end if;

  with cat_source as (
    select
      lower(regexp_replace(btrim(coalesce(c->>'id', c->>'slug', c->>'name', '')), '\s+', '-', 'g')) as slug,
      (c->>'name') as name,
      (ord - 1)::int as sort_order,
      coalesce(c->'items', '[]'::jsonb) as items
    from jsonb_array_elements(p_menu->'categories') with ordinality as t(c, ord)
  ),
  cat_input as (
    select slug, name, sort_order, items
    from (
      select
        cs.slug,
        coalesce(nullif(btrim(cs.name), ''), initcap(replace(cs.slug, '-', ' '))) as name,
        cs.sort_order,
        cs.items,
        row_number() over (partition by cs.slug order by cs.sort_order asc) as rn
      from cat_source cs
      where cs.slug is not null and btrim(cs.slug) <> ''
    ) d
    where d.rn = 1
  ),
  upserted as (
    insert into public.menu_categories (restaurant_id, slug, name, sort_order)
    select p_restaurant_id, slug, name, sort_order
    from cat_input
    on conflict (restaurant_id, slug)
    do update set
      name = excluded.name,
      sort_order = excluded.sort_order
    returning slug, id, (xmax = 0) as inserted
  ),
  cat_ids as (
    select ci.slug, mc.id
    from cat_input ci
    join public.menu_categories mc
      on mc.restaurant_id = p_restaurant_id
     and mc.slug = ci.slug
  ),
  stale_deleted as (
    delete from public.menu_categories mc
    where mc.restaurant_id = p_restaurant_id
      and not exists (
        select 1
        from cat_input ci
        where ci.slug = mc.slug
      )
    returning mc.id
  ),
  cleared_items as (
    delete from public.menu_items mi
    using public.menu_categories mc
    where mi.category_id = mc.id
      and mc.restaurant_id = p_restaurant_id
    returning mi.id
  ),
  inserted_items as (
    insert into public.menu_items (
      category_id, slug, name, diet, description, variants, options, is_available, sort_order
    )
    select
      ci2.id as category_id,
      (it->>'id') as slug,
      (it->>'name') as name,
      case
        when lower(coalesce(it->>'diet', 'veg')) in ('veg','nonveg','egg','seafood')
          then lower(coalesce(it->>'diet', 'veg'))
        else 'veg'
      end as diet,
      coalesce(it->>'description', '') as description,
      case when jsonb_typeof(it->'variants') = 'array' then it->'variants' else '[]'::jsonb end as variants,
      case when jsonb_typeof(it->'options') = 'array' then it->'options' else '[]'::jsonb end as options,
      coalesce((it->>'isAvailable')::boolean, true) as is_available,
      (it_ord - 1)::int as sort_order
    from cat_input ci
    join cat_ids ci2 on ci2.slug = ci.slug
    cross join lateral jsonb_array_elements(ci.items) with ordinality as t(it, it_ord)
    returning id
  )
  select
    (select count(*) from cat_source),
    (select count(*) from cat_input),
    (select count(*) from upserted where not inserted),
    (select count(*) from stale_deleted),
    (
      select coalesce(jsonb_object_agg(ci.slug, ci.id::text), '{}'::jsonb)
      from cat_ids ci
    )
  into
    categories_total_count,
    categories_upserted_count,
    conflicts_handled_count,
    stale_categories_deleted_count,
    category_ids;

  update public.restaurants
  set
    palette = coalesce(p_palette, palette),
    currency = coalesce(nullif(btrim(coalesce(p_currency, '')), ''), currency),
    branding = coalesce(p_branding, branding),
    updated_at = now()
  where id = p_restaurant_id;

  return jsonb_build_object(
    'categories_total_count', categories_total_count,
    'categories_upserted_count', categories_upserted_count,
    'conflicts_handled_count', conflicts_handled_count,
    'stale_categories_deleted_count', stale_categories_deleted_count,
    'category_ids', category_ids
  );
end;
$$;

