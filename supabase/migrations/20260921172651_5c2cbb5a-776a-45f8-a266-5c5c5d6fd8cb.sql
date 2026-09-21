ALTER FUNCTION public.offboard_client(uuid, uuid[], uuid[]) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) TO service_role;