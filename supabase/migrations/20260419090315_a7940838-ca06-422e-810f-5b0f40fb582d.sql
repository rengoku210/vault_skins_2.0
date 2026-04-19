-- 1. Lifecycle columns on transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS credentials_released boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credentials_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS handoff_notes text;

CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.transactions(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.transactions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON public.transactions(listing_id);

-- 2. Buyer-facing reveal RPC
-- Buyers can read decrypted credentials when:
--   • they are the buyer on a completed transaction AND
--   • (transaction_type = 'rent' AND not expired) OR
--     (transaction_type = 'buy'  AND credentials_released = true)
CREATE OR REPLACE FUNCTION public.buyer_reveal_credentials(_listing_id uuid)
RETURNS TABLE(username text, password text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
  _enc bytea;
  _json json;
  _txn record;
BEGIN
  SELECT * INTO _txn
  FROM public.transactions
  WHERE listing_id = _listing_id
    AND buyer_id = auth.uid()
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _txn IS NULL THEN
    RAISE EXCEPTION 'No completed purchase or rental for this listing';
  END IF;

  IF _txn.transaction_type = 'rent' THEN
    IF _txn.expires_at IS NOT NULL AND _txn.expires_at < now() THEN
      RAISE EXCEPTION 'Rental has expired';
    END IF;
  ELSE
    IF _txn.credentials_released IS NOT TRUE THEN
      RAISE EXCEPTION 'Credentials have not been released by an administrator yet';
    END IF;
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

REVOKE ALL ON FUNCTION public.buyer_reveal_credentials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buyer_reveal_credentials(uuid) TO authenticated;

-- 3. Admin release RPC: marks creds released, notifies buyer + seller, marks listing sold for buys
CREATE OR REPLACE FUNCTION public.admin_release_credentials(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _txn record;
  _listing_title text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO _txn FROM public.transactions WHERE id = _transaction_id;
  IF _txn IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  IF _txn.status <> 'completed' THEN
    RAISE EXCEPTION 'Transaction is not completed';
  END IF;

  UPDATE public.transactions
  SET credentials_released = true,
      credentials_released_at = now()
  WHERE id = _transaction_id;

  SELECT title INTO _listing_title FROM public.listings WHERE id = _txn.listing_id;

  -- For BUY: lock the listing as sold so it leaves the marketplace
  IF _txn.transaction_type = 'buy' THEN
    UPDATE public.listings SET status = 'sold' WHERE id = _txn.listing_id;
  END IF;

  -- Notify buyer
  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    _txn.buyer_id,
    CASE WHEN _txn.transaction_type = 'buy'
      THEN 'Ownership transferred'
      ELSE 'Rental credentials released' END,
    COALESCE(_listing_title, 'Your account') || ' — credentials are now available in your dashboard.',
    '/dashboard'
  );

  -- Notify seller
  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (
    _txn.seller_id,
    CASE WHEN _txn.transaction_type = 'buy'
      THEN 'Account transferred to buyer'
      ELSE 'Rental activated for buyer' END,
    COALESCE(_listing_title, 'Your account') || ' — admin has released credentials.',
    '/dashboard'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_release_credentials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_release_credentials(uuid) TO authenticated;