export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type QueryError = { message?: string } | null;
type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: string) => QueryBuilder;
  in: (column: string, values: string[]) => QueryBuilder;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: QueryError }>;
};
type SupabaseClientLike = {
  auth: {
    getUser: (token: string) => Promise<{
      data: { user: { id: string } | null };
      error: QueryError;
    }>;
  };
  from: (table: string) => QueryBuilder;
};

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get('Authorization') || '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

export async function assertAgencyAccess(
  req: Request,
  supabase: SupabaseClientLike,
  agencyId: string,
  roles?: string[],
) {
  const token = getBearerToken(req);
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (serviceRoleKey && token === serviceRoleKey) {
    return { internal: true, user: null };
  }

  if (!token) {
    throw new HttpError(401, 'Missing authorization');
  }

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (authError || !user) {
    throw new HttpError(401, 'Invalid session');
  }

  const query = supabase
    .from('agency_users')
    .select('role')
    .eq('agency_id', agencyId)
    .eq('user_id', user.id);

  if (roles && roles.length > 0) {
    query.in('role', roles);
  }

  const { data: membership, error: membershipError } = await query.maybeSingle();
  if (membershipError) {
    console.error('[auth] Agency membership lookup failed:', {
      agency_id: agencyId,
      user_id: user.id,
      message: membershipError.message,
    });
    throw new HttpError(500, 'Could not verify agency access');
  }

  if (!membership) {
    throw new HttpError(403, 'Forbidden: agency access required');
  }

  return { internal: false, user, role: membership.role };
}

export function assertOptionalSecret(req: Request, envName: string, headerName = 'x-cron-secret') {
  const expected = Deno.env.get(envName);
  if (!expected) return;

  const actual = req.headers.get(headerName);
  if (actual !== expected) {
    throw new HttpError(401, `Invalid ${headerName}`);
  }
}
