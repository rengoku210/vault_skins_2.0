-- ============================================================
-- 1. Enable pgcrypto for symmetric encryption
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ============================================================
-- 2. Internal encryption key (stored as a database setting via a security-definer accessor)
--    We use a dedicated table that ONLY security-definer funcs read.
-- ============================================================
CREATE TABLE IF NOT EXISTS public._app_keys (
  name text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public._app_keys ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Only SECURITY DEFINER funcs can read it.

-- Seed a strong random key once (idempotent)
INSERT INTO public._app_keys (name, value)
VALUES ('credentials_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public._get_credentials_key()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public._app_keys WHERE name = 'credentials_key' LIMIT 1;
$$;

-- ============================================================
-- 3. Drop demo plaintext credential columns, add secure ones
-- ============================================================
ALTER TABLE public.listings
  DROP COLUMN IF EXISTS riot_username_demo,
  DROP COLUMN IF EXISTS riot_password_demo;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS riot_id text,
  ADD COLUMN IF NOT EXISTS riot_region text,
  ADD COLUMN IF NOT EXISTS recovery_email text,
  ADD COLUMN IF NOT EXISTS riot_credentials_encrypted bytea;

-- ============================================================
-- 4. Pricing validation trigger (no negative values)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_listing_pricing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rent_hourly_price IS NOT NULL AND NEW.rent_hourly_price < 0 THEN
    RAISE EXCEPTION 'rent_hourly_price cannot be negative';
  END IF;
  IF NEW.rent_daily_price IS NOT NULL AND NEW.rent_daily_price < 0 THEN
    RAISE EXCEPTION 'rent_daily_price cannot be negative';
  END IF;
  IF NEW.buy_price IS NOT NULL AND NEW.buy_price < 0 THEN
    RAISE EXCEPTION 'buy_price cannot be negative';
  END IF;
  IF NEW.inventory_value IS NOT NULL AND NEW.inventory_value < 0 THEN
    RAISE EXCEPTION 'inventory_value cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_listing_pricing_trigger ON public.listings;
CREATE TRIGGER validate_listing_pricing_trigger
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.validate_listing_pricing();

-- ============================================================
-- 5. Seller-callable: encrypt and store credentials
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_listing_credentials(
  _listing_id uuid,
  _riot_username text,
  _riot_password text,
  _riot_id text DEFAULT NULL,
  _riot_region text DEFAULT NULL,
  _recovery_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller uuid;
  _key text;
  _payload text;
BEGIN
  SELECT seller_id INTO _seller FROM public.listings WHERE id = _listing_id;
  IF _seller IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF _seller <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _riot_username IS NULL OR length(trim(_riot_username)) = 0 THEN
    RAISE EXCEPTION 'Riot username required';
  END IF;
  IF _riot_password IS NULL OR length(_riot_password) = 0 THEN
    RAISE EXCEPTION 'Riot password required';
  END IF;

  _key := public._get_credentials_key();
  _payload := json_build_object(
    'username', _riot_username,
    'password', _riot_password
  )::text;

  UPDATE public.listings
  SET riot_credentials_encrypted = pgp_sym_encrypt(_payload, _key),
      riot_id = COALESCE(_riot_id, riot_id),
      riot_region = COALESCE(_riot_region, riot_region),
      recovery_email = COALESCE(_recovery_email, recovery_email),
      updated_at = now()
  WHERE id = _listing_id;
END;
$$;

-- ============================================================
-- 6. Admin-callable: decrypt credentials (requires completed transaction)
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrypt_listing_credentials(_listing_id uuid)
RETURNS TABLE(username text, password text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key text;
  _decrypted text;
  _completed_count int;
  _enc bytea;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can decrypt credentials';
  END IF;

  SELECT COUNT(*) INTO _completed_count
  FROM public.transactions
  WHERE listing_id = _listing_id AND status = 'completed';

  IF _completed_count = 0 THEN
    RAISE EXCEPTION 'Cannot decrypt: no completed transaction for this listing';
  END IF;

  SELECT riot_credentials_encrypted INTO _enc
  FROM public.listings WHERE id = _listing_id;

  IF _enc IS NULL THEN
    RAISE EXCEPTION 'No credentials stored for this listing';
  END IF;

  _key := public._get_credentials_key();
  _decrypted := pgp_sym_decrypt(_enc, _key);

  RETURN QUERY SELECT
    (_decrypted::json ->> 'username')::text,
    (_decrypted::json ->> 'password')::text;
END;
$$;

-- ============================================================
-- 7. listing_skins: relational owned-skin inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS public.listing_skins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  skin_uuid text NOT NULL,
  skin_name text NOT NULL,
  weapon_uuid text,
  weapon_name text,
  display_icon text,
  preview_video text,
  content_tier_uuid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, skin_uuid)
);

CREATE INDEX IF NOT EXISTS idx_listing_skins_listing_id ON public.listing_skins(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_skins_weapon ON public.listing_skins(weapon_uuid);

ALTER TABLE public.listing_skins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Listing skins follow listing visibility" ON public.listing_skins;
CREATE POLICY "Listing skins follow listing visibility"
ON public.listing_skins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_skins.listing_id
      AND (
        l.status = 'approved'
        OR l.seller_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

DROP POLICY IF EXISTS "Sellers manage own listing skins" ON public.listing_skins;
CREATE POLICY "Sellers manage own listing skins"
ON public.listing_skins FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_skins.listing_id AND l.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_skins.listing_id AND l.seller_id = auth.uid()
  )
);