import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAgency } from './useAgency';
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
  max_leads: number;
  max_tasks: number;
  max_storage_gb: number;
  has_crm: boolean;
  has_advanced_reports: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  has_priority_support: boolean;
  max_facebook_ad_accounts: number;
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
  checkSubscription: () => Promise<void>;
  createCheckout: (priceId: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  isFeatureAvailable: (feature: string) => boolean;
  hasReachedLimit: (limitType: string, currentCount: number) => boolean;
  getMaxFacebookAdAccounts: () => number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    }
  };

  const checkSubscription = async () => {
    if (!user) return;

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
    } catch (error) {
      console.error('Error checking subscription:', error);
      setCurrentSubscription({
        subscribed: false,
        subscription_status: 'none',
      });
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
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      // Open checkout in new tab
      if (data.url) {
        window.open(data.url, '_blank');
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
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Erro ao abrir portal do cliente. Tente novamente.');
    }
  };

  const refreshPlans = async () => {
    await fetchPlans();
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
    const currentPlan = currentSubscription?.subscribed 
      ? plans.find(p => p.name === currentSubscription.plan_name)
      : plans.find(p => p.slug === 'free');

    const max = currentPlan?.max_facebook_ad_accounts;
    if (!max || isNaN(max as any)) return 10; // fallback
    return max >= 999999 ? Number.POSITIVE_INFINITY : max;
  };

  useEffect(() => {
    if (user) {
      fetchPlans();
      checkSubscription();

      // Set up periodic check every 30 seconds
      const interval = setInterval(checkSubscription, 30000);
      return () => clearInterval(interval);
    } else {
      setCurrentSubscription(null);
      setLoading(false);
    }
  }, [user]);

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
        checkSubscription,
        createCheckout,
        openCustomerPortal,
        refreshPlans,
        isFeatureAvailable,
        hasReachedLimit,
        getMaxFacebookAdAccounts,
      }}
    >
      {children}
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