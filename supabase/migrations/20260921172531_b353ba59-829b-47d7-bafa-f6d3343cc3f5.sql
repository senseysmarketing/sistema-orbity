REVOKE ALL ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offboard_client(uuid, uuid[], uuid[]) TO service_role;