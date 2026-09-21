ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS preserved_after_deactivation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preserved_at timestamptz;

COMMENT ON COLUMN public.client_payments.preserved_after_deactivation IS
  'True when an existing charge was explicitly kept during client deactivation.';

CREATE OR REPLACE FUNCTION public.offboard_client(
  p_client_id uuid,
  p_cancel_payment_ids uuid[] DEFAULT '{}'::uuid[],
  p_preserve_payment_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency_id uuid;
  v_cancelled_count integer := 0;
  v_preserved_count integer := 0;
BEGIN
  SELECT agency_id
    INTO v_agency_id
  FROM public.clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  IF NOT public.user_belongs_to_agency(v_agency_id) OR NOT public.is_agency_admin(v_agency_id) THEN
    RAISE EXCEPTION 'Not authorized to deactivate this client';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_cancel_payment_ids, '{}'::uuid[]) || coalesce(p_preserve_payment_ids, '{}'::uuid[])) AS requested(id)
    LEFT JOIN public.client_payments payment
      ON payment.id = requested.id
     AND payment.client_id = p_client_id
     AND payment.agency_id = v_agency_id
    WHERE payment.id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more payments do not belong to this client';
  END IF;

  IF coalesce(p_cancel_payment_ids, '{}'::uuid[]) && coalesce(p_preserve_payment_ids, '{}'::uuid[]) THEN
    RAISE EXCEPTION 'A payment cannot be cancelled and preserved at the same time';
  END IF;

  UPDATE public.client_payments
  SET status = 'cancelled',
      preserved_after_deactivation = false,
      preserved_at = NULL,
      description = CASE
        WHEN coalesce(description, '') LIKE '%[Cancelado na inativação do cliente]%'
          THEN description
        ELSE concat_ws(' ', nullif(description, ''), '[Cancelado na inativação do cliente]')
      END,
      updated_at = now()
  WHERE client_id = p_client_id
    AND agency_id = v_agency_id
    AND id = ANY(coalesce(p_cancel_payment_ids, '{}'::uuid[]))
    AND status IN ('pending', 'overdue');
  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

  UPDATE public.client_payments
  SET preserved_after_deactivation = true,
      preserved_at = now(),
      updated_at = now()
  WHERE client_id = p_client_id
    AND agency_id = v_agency_id
    AND id = ANY(coalesce(p_preserve_payment_ids, '{}'::uuid[]))
    AND status IN ('pending', 'overdue');
  GET DIAGNOSTICS v_preserved_count = ROW_COUNT;

  UPDATE public.clients
  SET active = false,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_client_id
    AND agency_id = v_agency_id;

  RETURN jsonb_build_object(
    'client_id', p_client_id,
    'cancelled_count', v_cancelled_count,
    'preserved_count', v_preserved_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) TO service_role;

UPDATE public.client_payments
SET preserved_after_deactivation = true,
    preserved_at = coalesce(preserved_at, '2026-09-21T17:10:40Z'::timestamptz),
    updated_at = now()
WHERE id = '60544971-1ae9-450f-9a5c-5ec7830d74da'::uuid
  AND client_id = '8c78f355-c46d-42d4-84d8-c1406aa7b162'::uuid
  AND status IN ('pending', 'overdue');