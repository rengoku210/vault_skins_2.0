CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate the encryption helpers to use the extensions schema explicitly
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
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
  _payload text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = _listing_id AND seller_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to set credentials for this listing';
  END IF;

  SELECT value INTO _key FROM public._app_keys WHERE name = 'credentials_key';
  IF _key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;

  _payload := json_build_object(
    'username', _riot_username,
    'password', _riot_password
  )::text;

  UPDATE public.listings
  SET
    riot_credentials_encrypted = extensions.pgp_sym_encrypt(_payload, _key),
    riot_id = COALESCE(_riot_id, riot_id),
    riot_region = COALESCE(_riot_region, riot_region),
    recovery_email = COALESCE(_recovery_email, recovery_email),
    updated_at = now()
  WHERE id = _listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_listing_credentials(_listing_id uuid)
RETURNS TABLE(username text, password text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
  _enc bytea;
  _json json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE listing_id = _listing_id AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'No completed transaction for this listing';
  END IF;

  SELECT value INTO _key FROM public._app_keys WHERE name = 'credentials_key';
  SELECT riot_credentials_encrypted INTO _enc FROM public.listings WHERE id = _listing_id;
  IF _enc IS NULL THEN
    RAISE EXCEPTION 'No credentials stored';
  END IF;

  _json := extensions.pgp_sym_decrypt(_enc, _key)::json;
  RETURN QUERY SELECT _json->>'username', _json->>'password';
END;
$$;

-- Ensure the encryption key exists
INSERT INTO public._app_keys (name, value)
VALUES ('credentials_key', encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (name) DO NOTHING;