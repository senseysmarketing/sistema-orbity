CREATE OR REPLACE FUNCTION public.offboard_client(
  p_client_id uuid,
  p_cancel_payment_ids uuid[] DEFAULT '{}'::uuid[],
  p_preserve_payment_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.agency_users
    WHERE user_id = (select auth.uid())
      AND agency_id = v_agency_id
      AND is_active = true
      AND role IN ('administrador', 'super_admin', 'agency_admin')
  ) THEN
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
    AND status IN ('pending', 'overdue')
    AND NOT (id = ANY(coalesce(p_cancel_payment_ids, '{}'::uuid[])));
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
REVOKE EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) TO service_role;