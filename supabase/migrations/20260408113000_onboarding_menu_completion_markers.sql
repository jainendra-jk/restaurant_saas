-- Track two-phase onboarding completion.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS onboarding_details_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS menu_import_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Backfill existing onboarded tenants conservatively when they already have menu categories.
UPDATE public.restaurants r
SET
  onboarding_details_completed_at = COALESCE(r.onboarding_details_completed_at, r.created_at),
  menu_import_completed_at = COALESCE(r.menu_import_completed_at, now()),
  onboarding_completed_at = COALESCE(r.onboarding_completed_at, now())
WHERE EXISTS (
  SELECT 1 FROM public.menu_categories mc WHERE mc.restaurant_id = r.id
);

-- Keep onboarding RPC aligned with new two-phase markers.
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_restaurant_name text,
  p_slug_base text,
  p_customer_app_origin text,
  p_owner_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_address_line1 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_pincode text DEFAULT NULL,
  p_gst_number text DEFAULT NULL,
  p_fssai_number text DEFAULT NULL,
  p_requested_tables integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entitlement public.saas_entitlements%ROWTYPE;
  v_table_limit integer;
  v_table_count integer;
  v_restaurant_id uuid;
  v_slug_base text;
  v_slug text;
  v_try int := 0;
  v_branding jsonb := '{"tagline":"","welcomeMessage":"Welcome back","orderNumberPrefix":"#"}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = v_user_id) THEN
    RAISE EXCEPTION 'ALREADY_ONBOARDED';
  END IF;

  SELECT *
  INTO v_entitlement
  FROM public.saas_entitlements se
  WHERE se.user_id = v_user_id
    AND se.status IN ('active', 'trialing')
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_ENTITLEMENT';
  END IF;

  v_table_limit := v_entitlement.max_tables;
  v_table_count := COALESCE(p_requested_tables, v_table_limit);
  v_table_count := GREATEST(1, LEAST(v_table_count, v_table_limit));

  IF COALESCE(btrim(p_restaurant_name), '') = '' THEN
    RAISE EXCEPTION 'INVALID_RESTAURANT_NAME';
  END IF;

  v_slug_base := lower(regexp_replace(COALESCE(NULLIF(btrim(p_slug_base), ''), p_restaurant_name), '[^a-zA-Z0-9\s-]', '', 'g'));
  v_slug_base := regexp_replace(v_slug_base, '\s+', '-', 'g');
  v_slug_base := regexp_replace(v_slug_base, '-+', '-', 'g');
  v_slug_base := trim(both '-' from v_slug_base);
  IF v_slug_base = '' THEN
    v_slug_base := 'restaurant';
  END IF;

  LOOP
    v_slug := CASE
      WHEN v_try = 0 THEN v_slug_base
      ELSE v_slug_base || '-' || substr(md5(gen_random_uuid()::text), 1, 6)
    END;

    BEGIN
      INSERT INTO public.restaurants (
        slug,
        name,
        customer_app_origin,
        branding,
        owner_name,
        phone,
        email,
        address_line1,
        city,
        state,
        pincode,
        gst_number,
        fssai_number,
        onboarding_details_completed_at
      )
      VALUES (
        v_slug,
        btrim(p_restaurant_name),
        NULLIF(btrim(COALESCE(p_customer_app_origin, '')), ''),
        v_branding,
        NULLIF(btrim(COALESCE(p_owner_name, '')), ''),
        NULLIF(btrim(COALESCE(p_phone, '')), ''),
        NULLIF(btrim(COALESCE(p_email, '')), ''),
        NULLIF(btrim(COALESCE(p_address_line1, '')), ''),
        NULLIF(btrim(COALESCE(p_city, '')), ''),
        NULLIF(btrim(COALESCE(p_state, '')), ''),
        NULLIF(btrim(COALESCE(p_pincode, '')), ''),
        NULLIF(btrim(COALESCE(p_gst_number, '')), ''),
        NULLIF(btrim(COALESCE(p_fssai_number, '')), ''),
        now()
      )
      RETURNING id INTO v_restaurant_id;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_try := v_try + 1;
        IF v_try > 10 THEN
          RAISE EXCEPTION 'SLUG_CONFLICT';
        END IF;
    END;
  END LOOP;

  INSERT INTO public.staff_profiles (user_id, restaurant_id, role)
  VALUES (v_user_id, v_restaurant_id, 'owner');

  INSERT INTO public.tables (restaurant_id, number, status, seats)
  SELECT
    v_restaurant_id,
    g.n,
    'inactive',
    CASE
      WHEN (g.n - 1) % 3 = 0 THEN 6
      WHEN (g.n - 1) % 3 = 1 THEN 4
      ELSE 2
    END
  FROM generate_series(1, v_table_count) AS g(n);

  RETURN jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'table_count', v_table_count,
    'plan_tier', v_entitlement.plan_tier
  );
END;
$$;
