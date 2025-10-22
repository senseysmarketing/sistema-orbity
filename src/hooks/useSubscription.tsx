import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  createCheckout: (priceId: string) => Promise<void>;
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

  const createCheckout = async (priceId: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer uma assinatura');
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

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;

      // Open checkout in new tab
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
      case 'advanced_reports':
        return currentPlan.has_advanced_reports;
      case 'api_access':
        return currentPlan.has_api_access;
      case 'white_label':
        return currentPlan.has_white_label;
      case 'priority_support':
        return currentPlan.has_priority_support;
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
      case 'leads':
        return currentCount >= currentPlan.max_leads;
      case 'tasks':
        return currentCount >= currentPlan.max_tasks;
      case 'storage':
        return currentCount >= currentPlan.max_storage_gb;
      case 'facebook_ad_accounts':
        return currentCount >= currentPlan.max_facebook_ad_accounts;
      default:
        return false;
    }
  };

  const getMaxFacebookAdAccounts = (): number => {
    // Try to match plan by name (case-insensitive) first
    let currentPlan = currentSubscription?.subscribed 
      ? plans.find(p => p.name.trim().toLowerCase() === (currentSubscription.plan_name || '').trim().toLowerCase())
      : plans.find(p => p.slug === 'free');

    // Fallbacks if exact match not found
    if (!currentPlan && currentSubscription?.plan_name) {
      const planNameLc = currentSubscription.plan_name.trim().toLowerCase();
      // partial match
      currentPlan = plans.find(p => p.name.trim().toLowerCase().includes(planNameLc) || planNameLc.includes(p.name.trim().toLowerCase())) || undefined;
      // explicit Senseys fallback by slug if user plan mentions it
      if (!currentPlan && planNameLc.includes('senseys')) {
        currentPlan = plans.find(p => p.slug === 'senseys') || currentPlan;
      }
    }

    // If still not found, keep free as the minimal fallback
    if (!currentPlan) {
      currentPlan = plans.find(p => p.slug === 'free');
    }

    const max = currentPlan?.max_facebook_ad_accounts;
    if (!max || isNaN(max as any)) return 10; // fallback
    return max >= 999999 ? Number.POSITIVE_INFINITY : max;
  };

  // Check if user has been away for too long when page becomes visible
  useEffect(() => {
    if (isVisible && user) {
      const timeAway = getTimeAway();
      const AWAY_THRESHOLD = 10 * 60 * 1000; // 10 minutes
      
      if (timeAway > AWAY_THRESHOLD) {
        setShowRefreshAlert(true);
      }
    }
  }, [isVisible, user, getTimeAway]);

  useEffect(() => {
    if (user) {
      fetchPlans();
      checkSubscription();

      // Reduced frequency: check every 5 minutes instead of 30 seconds
      const interval = setInterval(() => {
        // Only check if page is visible and user is active
        if (isVisible) {
          const timeSinceLastCheck = Date.now() - lastCheckTime;
          if (timeSinceLastCheck > 5 * 60 * 1000) { // 5 minutes
            checkSubscription();
          }
        }
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    } else {
      setCurrentSubscription(null);
      setLoading(false);
    }
  }, [user, isVisible]);

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