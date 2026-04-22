import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Agency {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  subscription_plan: 'free' | 'basic' | 'pro' | 'enterprise';
  subscription_expires_at?: string;
  max_users: number;
  max_clients: number;
  max_leads: number;
  max_tasks: number;
  is_active: boolean;
  monthly_value?: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

interface AgencyUser {
  id: string;
  agency_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

interface AgencyContextType {
  currentAgency: Agency | null;
  userAgencies: Agency[];
  agencyRole: string | null;
  loading: boolean;
  hasNoAgency: boolean;
  fetchError: boolean;
  switchAgency: (agencyId: string) => Promise<void>;
  createAgency: (agencyData: Partial<Agency>) => Promise<Agency | null>;
  updateAgency: (agencyId: string, updates: Partial<Agency>) => Promise<void>;
  inviteUser: (email: string, role: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  refreshAgencies: () => Promise<void>;
  isAgencyAdmin: () => boolean;
  isAgencyOwner: () => boolean;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);
  const [userAgencies, setUserAgencies] = useState<Agency[]>([]);
  const [agencyRole, setAgencyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasNoAgency, setHasNoAgency] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Ref para evitar re-fetch quando user não mudou
  const previousUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const pickInitialAgencyId = (
    agencyUsers: Array<{ agency_id: string; role: string; created_at?: string }>,
    subs: Array<{ agency_id: string; status: string; trial_end: string | null }>,
    savedId: string | null
  ): string => {
    // 1) Saved preference wins if still valid
    if (savedId && agencyUsers.some(au => au.agency_id === savedId)) {
      return savedId;
    }
    const now = new Date();
    const isSubValid = (s: { status: string; trial_end: string | null }) => {
      if (s.status === 'active' || s.status === 'past_due') return true;
      if (s.status === 'trial' || s.status === 'trialing') {
        return !!s.trial_end && new Date(s.trial_end) > now;
      }
      return false;
    };
    const validIds = new Set(subs.filter(isSubValid).map(s => s.agency_id));

    const sorted = [...agencyUsers].sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || '')
    );

    const adminWithSub = sorted.find(au =>
      validIds.has(au.agency_id) && ['owner', 'admin'].includes(au.role)
    );
    if (adminWithSub) return adminWithSub.agency_id;

    const memberWithSub = sorted.find(au => validIds.has(au.agency_id));
    if (memberWithSub) return memberWithSub.agency_id;

    const adminAny = sorted.find(au => ['owner', 'admin'].includes(au.role));
    if (adminAny) return adminAny.agency_id;

    return sorted[0].agency_id;
  };

  const fetchUserAgencies = async () => {
    if (!user) return;

    if (isFetchingRef.current) {
      console.log('[Agency] Already fetching, skipping duplicate call');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setFetchError(false);

    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Agency] Fetch attempt ${attempt}/${MAX_RETRIES}`);
        const { data: agencyUsers, error: agencyUsersError } = await supabase
          .from('agency_users')
          .select(`
            *,
            agencies (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (agencyUsersError) throw agencyUsersError;

        if (!user) {
          console.log('[Agency] User became null during fetch, discarding result');
          isFetchingRef.current = false;
          setLoading(false);
          return;
        }

        const agencies = agencyUsers?.map(au => au.agencies).filter(Boolean) || [];
        setUserAgencies(agencies);

        if (agencies.length === 0) {
          setHasNoAgency(true);
          setCurrentAgency(null);
          setAgencyRole(null);
          localStorage.removeItem('currentAgencyId');
        } else {
          setHasNoAgency(false);

          if (!currentAgency) {
            // Fetch subscriptions for deterministic selection
            const agencyIds = agencies.map((a: any) => a.id);
            const { data: subsData } = await supabase
              .from('agency_subscriptions')
              .select('agency_id, status, trial_end')
              .in('agency_id', agencyIds);

            const savedId = localStorage.getItem('currentAgencyId');
            const auList = (agencyUsers || []).map((au: any) => ({
              agency_id: au.agency_id,
              role: au.role,
              created_at: au.created_at,
            }));
            const chosenId = pickInitialAgencyId(auList, (subsData || []) as any, savedId);

            const chosenAgency = agencies.find((a: any) => a.id === chosenId) || agencies[0];
            const userRole = agencyUsers?.find(au => au.agency_id === chosenAgency.id)?.role;
            setCurrentAgency(chosenAgency);
            setAgencyRole(userRole || null);
            localStorage.setItem('currentAgencyId', chosenAgency.id);
            console.log('[Agency] Initial agency selected:', chosenAgency.name, 'role:', userRole);
          }
        }

        isFetchingRef.current = false;
        setLoading(false);
        return;
      } catch (error) {
        console.error(`[Agency] Attempt ${attempt} failed:`, error);
        if (attempt < MAX_RETRIES) {
          await delay(1000);
        } else {
          console.error('[Agency] All retries failed, setting fetchError');
          setFetchError(true);
        }
      }
    }

    isFetchingRef.current = false;
    setLoading(false);
  };

  const switchAgency = async (agencyId: string) => {
    const agency = userAgencies.find(a => a.id === agencyId);
    if (!agency) return;

    try {
      const { data: agencyUser, error } = await supabase
        .from('agency_users')
        .select('role')
        .eq('agency_id', agencyId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setCurrentAgency(agency);
      setAgencyRole(agencyUser.role);
      localStorage.setItem('currentAgencyId', agencyId);
      
      toast.success(`Agência alterada para ${agency.name}`);
    } catch (error) {
      console.error('Error switching agency:', error);
      toast.error('Erro ao alterar agência');
    }
  };

  const createAgency = async (agencyData: Partial<Agency>): Promise<Agency | null> => {
    if (!user) return null;

    try {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: agencyData.name,
          slug: agencyData.slug || agencyData.name?.toLowerCase().replace(/\s+/g, '-'),
          description: agencyData.description,
          contact_email: agencyData.contact_email || user.email,
          subscription_plan: agencyData.subscription_plan || 'free'
        })
        .select()
        .single();

      if (agencyError) throw agencyError;

      // Add user as owner
      const { error: userError } = await supabase
        .from('agency_users')
        .insert({
          agency_id: agency.id,
          user_id: user.id,
          role: 'owner'
        });

      if (userError) throw userError;

      await refreshAgencies();
      await switchAgency(agency.id);
      
      toast.success('Agência criada com sucesso!');
      return agency;
    } catch (error) {
      console.error('Error creating agency:', error);
      toast.error('Erro ao criar agência');
      return null;
    }
  };

  const updateAgency = async (agencyId: string, updates: Partial<Agency>) => {
    try {
      const { error } = await supabase
        .from('agencies')
        .update(updates)
        .eq('id', agencyId);

      if (error) throw error;

      await refreshAgencies();
      toast.success('Agência atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating agency:', error);
      toast.error('Erro ao atualizar agência');
    }
  };

  const inviteUser = async (email: string, role: string) => {
    // Implementation for user invitation would go here
    // This would typically involve sending an email invitation
    toast.info('Funcionalidade de convite em desenvolvimento');
  };

  const removeUser = async (userId: string) => {
    if (!currentAgency) return;

    try {
      const { error } = await supabase
        .from('agency_users')
        .delete()
        .eq('agency_id', currentAgency.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Usuário removido da agência');
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Erro ao remover usuário');
    }
  };

  const refreshAgencies = async () => {
    await fetchUserAgencies();
  };

  const isAgencyAdmin = () => {
    return agencyRole === 'admin' || agencyRole === 'owner';
  };

  const isAgencyOwner = () => {
    return agencyRole === 'owner';
  };

  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // Só executar se user ID realmente mudou
    if (currentUserId === previousUserIdRef.current) {
      console.log('[Agency] User ID unchanged, skipping fetch');
      return;
    }
    
    console.log('[Agency] User ID changed:', previousUserIdRef.current, '->', currentUserId);
    previousUserIdRef.current = currentUserId;
    
    if (user) {
      fetchUserAgencies();
    } else {
      setCurrentAgency(null);
      setUserAgencies([]);
      setAgencyRole(null);
      setHasNoAgency(false);
      setLoading(false);
    }
  }, [user?.id]); // Depender apenas do ID, não do objeto inteiro

  // Restore current agency from localStorage
  useEffect(() => {
    const savedAgencyId = localStorage.getItem('currentAgencyId');
    if (savedAgencyId && userAgencies.length > 0 && !currentAgency) {
      const savedAgency = userAgencies.find(a => a.id === savedAgencyId);
      if (savedAgency) {
        switchAgency(savedAgencyId);
      }
    }
  }, [userAgencies]);

  return (
    <AgencyContext.Provider
      value={{
        currentAgency,
        userAgencies,
        agencyRole,
        loading,
        hasNoAgency,
        fetchError,
        switchAgency,
        createAgency,
        updateAgency,
        inviteUser,
        removeUser,
        refreshAgencies,
        isAgencyAdmin,
        isAgencyOwner,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error('useAgency must be used within an AgencyProvider');
  }
  return context;
}