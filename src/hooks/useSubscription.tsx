import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAgency } from './useAgency';
import { useCache } from './useCache';
import { usePageVisibility } from './usePageVisibility';
import { SessionAlert } from '@/components/ui/session-alert';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  max_users: number;
  max_clients: number;
  max_contracts: number;
  max_leads: number;
  max_tasks: number;
  has_crm: boolean;
  sort_order: number;
}

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_status?: string;
  plan_name?: string;
  price_id?: string;
  trial_end?: string;
  subscription_end?: string;
  customer_id?: string;
  subscription_id?: string;
}

interface SubscriptionContextType {
  plans: SubscriptionPlan[];
  currentSubscription: SubscriptionStatus | null;
  loading: boolean;
  refreshing: boolean;
  showRefreshAlert: boolean;
  checkSubscription: (forceRefresh?: boolean) => Promise<void>;
  createCheckout: (priceId?: string, agencyId?: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  isFeatureAvailable: (feature: string) => boolean;
  hasReachedLimit: (limitType: string, currentCount: number) => boolean;
  getMaxFacebookAdAccounts: () => number;
  dismissRefreshAlert: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const { isVisible, getTimeAway } = usePageVisibility();
  const cache = useCache<SubscriptionStatus>(5 * 60 * 1000); // 5 minutes cache
  const plansCache = useCache<SubscriptionPlan[]>(10 * 60 * 1000); // 10 minutes cache
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshAlert, setShowRefreshAlert] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  
  // Refs para controlar visibilidade sem causar re-renders
  const wasVisibleRef = useRef(true);
  const lastVisibilityCheckRef = useRef(Date.now());

  const fetchPlans = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = plansCache.get('plans');
      if (cached.exists && !cached.isStale) {
        setPlans(cached.data || []);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      const planData = data || [];
      setPlans(planData);
      plansCache.set('plans', planData);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    }
  };

  const checkSubscription = async (forceRefresh = false) => {
    if (!user) return;

    const cacheKey = `subscription_${user.id}_${currentAgency?.id}`;
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached.exists && !cached.isStale) {
        setCurrentSubscription(cached.data);
        if (loading) setLoading(false);
        return;
      }
    }

    const isRefreshing = refreshing;
    if (!isRefreshing) setRefreshing(true);

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      setCurrentSubscription(data);
      cache.set(cacheKey, data);
      setLastCheckTime(Date.now());
    } catch (error) {
      console.error('Error checking subscription:', error);
      const fallbackData = {
        subscribed: false,
        subscription_status: 'none',
      };
      setCurrentSubscription(fallbackData);
      cache.set(cacheKey, fallbackData, { ttl: 30000 }); // Short cache for errors
    } finally {
      if (!isRefreshing) setRefreshing(false);
      if (loading) setLoading(false);
    }
  };

  const createCheckout = async (priceId?: string, agencyId?: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer uma assinatura');
      return;
    }

    if (!priceId && !agencyId) {
      toast.error('Nenhum plano ou agência especificada');
      return;
    }

    try {
      let { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        accessToken = refreshData.session?.access_token;
      }
      if (!accessToken) {
        toast.error('Sessão expirada. Entre novamente.');
        return;
      }

      const body: any = {};
      if (priceId) body.priceId = priceId;
      if (agencyId) body.agencyId = agencyId;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error('Não foi possível iniciar o checkout.');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erro ao criar checkout. Tente novamente.');
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      // Ensure we have a valid access token
      let { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        accessToken = refreshData.session?.access_token;
      }
      if (!accessToken) {
        toast.error('Sessão expirada. Entre novamente.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        const errorMsg = (error as any).message || '';
        if (errorMsg.includes('No Stripe customer found')) {
          toast.error('Você ainda não tem uma assinatura. Por favor, escolha um plano primeiro.');
          return;
        }
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error('Não foi possível gerar o link do portal.');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Erro ao abrir portal do cliente. Tente novamente.');
    }
  };

  const refreshPlans = async () => {
    await fetchPlans(true);
  };

  const dismissRefreshAlert = () => {
    setShowRefreshAlert(false);
  };

  const isFeatureAvailable = (feature: string): boolean => {
    if (!currentSubscription?.subscribed) {
      // Free plan features
      return ['basic_features'].includes(feature);
    }

    const currentPlan = plans.find(p => p.name === currentSubscription.plan_name);
    if (!currentPlan) return false;

    switch (feature) {
      case 'crm':
        return currentPlan.has_crm;
      default:
        return true;
    }
  };

  const hasReachedLimit = (limitType: string, currentCount: number): boolean => {
    if (!currentAgency) return true;

    const currentPlan = currentSubscription?.subscribed 
      ? plans.find(p => p.name === currentSubscription.plan_name)
      : plans.find(p => p.slug === 'free');

    if (!currentPlan) return true;

    switch (limitType) {
      case 'users':
        return currentCount >= currentPlan.max_users;
      case 'clients':
        return currentCount >= currentPlan.max_clients;
      case 'contracts':
        return currentCount >= currentPlan.max_contracts;
      case 'leads':
        return currentCount >= currentPlan.max_leads;
      case 'tasks':
        return currentCount >= currentPlan.max_tasks;
      default:
        return false;
    }
  };

  const getMaxFacebookAdAccounts = (): number => {
    // All plans have unlimited Facebook Ad Accounts for now
    return Number.POSITIVE_INFINITY;
  };

  // Ref para debounce de visibilidade
  const visibilityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if user has been away for too long when page becomes visible
  // Using refs and debounce to avoid re-renders on every visibility change
  useEffect(() => {
    const AWAY_THRESHOLD = 10 * 60 * 1000; // 10 minutes
    
    if (!isVisible) {
      // Usuário saiu da aba - registrar timestamp
      wasVisibleRef.current = false;
      lastVisibilityCheckRef.current = Date.now();
      return;
    }
    
    // Limpar debounce anterior
    if (visibilityDebounceRef.current) {
      clearTimeout(visibilityDebounceRef.current);
    }
    
    // Debounce para evitar checks rápidos demais (ex: alt-tab rápido)
    visibilityDebounceRef.current = setTimeout(() => {
      if (!wasVisibleRef.current) {
        const timeAway = Date.now() - lastVisibilityCheckRef.current;
        
        // Só mostrar alerta se ficou muito tempo fora
        if (user && timeAway > AWAY_THRESHOLD) {
          console.log('[Subscription] User was away for', Math.round(timeAway / 1000), 'seconds');
          setShowRefreshAlert(true);
        }
      }
      wasVisibleRef.current = true;
    }, 500); // 500ms debounce
    
    return () => {
      if (visibilityDebounceRef.current) {
        clearTimeout(visibilityDebounceRef.current);
      }
    };
  }, [isVisible]); // Removed user from deps to prevent re-renders

  useEffect(() => {
    if (user) {
      fetchPlans();
      checkSubscription();

      // Reduced frequency: check every 5 minutes
      const interval = setInterval(() => {
        const timeSinceLastCheck = Date.now() - lastCheckTime;
        if (timeSinceLastCheck > 5 * 60 * 1000) {
          checkSubscription();
        }
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    } else {
      setCurrentSubscription(null);
      setLoading(false);
    }
  }, [user]); // Removed isVisible to prevent re-renders on tab switch

  // Check subscription when user changes agency
  useEffect(() => {
    if (user && currentAgency) {
      checkSubscription();
    }
  }, [currentAgency]);

  return (
    <SubscriptionContext.Provider
      value={{
        plans,
        currentSubscription,
        loading,
        refreshing,
        showRefreshAlert,
        checkSubscription,
        createCheckout,
        openCustomerPortal,
        refreshPlans,
        isFeatureAvailable,
        hasReachedLimit,
        getMaxFacebookAdAccounts,
        dismissRefreshAlert,
      }}
    >
      {children}
      <SessionAlert
        show={showRefreshAlert}
        title="Dados Desatualizados"
        message="Você ficou muito tempo fora do sistema. Recomendamos atualizar os dados."
        onRefresh={() => {
          checkSubscription(true);
          dismissRefreshAlert();
        }}
        onDismiss={dismissRefreshAlert}
        autoHide={15000} // Auto hide after 15 seconds
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}