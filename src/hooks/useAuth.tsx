import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SessionAlert } from '@/components/ui/session-alert';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'agency_admin' | 'agency_user';
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  sessionExpired: boolean;
  showSessionAlert: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  dismissSessionAlert: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showSessionAlert, setShowSessionAlert] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const { toast } = useToast();

  // Session timeout: 2 hours
  const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      setLastActivityTime(Date.now());
      setSessionExpired(false);
      setShowSessionAlert(false);
      
      toast({
        title: "Sessão atualizada",
        description: "Seus dados foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error('Error refreshing session:', error);
      setSessionExpired(true);
      setShowSessionAlert(true);
    }
  };

  const dismissSessionAlert = () => {
    setShowSessionAlert(false);
  };

  // Check for session expiration
  useEffect(() => {
    if (!user || !session) return;

    const checkSessionExpiry = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        setSessionExpired(true);
        setShowSessionAlert(true);
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, session, lastActivityTime]);

  // Update activity time on user interaction
  useEffect(() => {
    const updateActivity = () => {
      setLastActivityTime(Date.now());
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setLastActivityTime(Date.now());
          setSessionExpired(false);
          setShowSessionAlert(false);
          
          // Fetch user profile
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            if (profileData) {
              setProfile(profileData as Profile);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: profileData }) => {
            if (profileData) {
              setProfile(profileData as Profile);
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message === 'Invalid login credentials' 
            ? "Credenciais inválidas. Verifique seu email e senha."
            : error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta ao Sistema Senseys.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
          }
        }
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message === 'User already registered' 
            ? "Este email já está cadastrado. Tente fazer login."
            : error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta criada!",
          description: "Sua conta foi criada com sucesso. Faça login para continuar.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Always clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      setSessionExpired(false);
      setShowSessionAlert(false);

      // Try to sign out from Supabase, but don't fail if session is already invalid
      await supabase.auth.signOut();

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });

      // Force redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even if there's an error, we've cleared local state, so just redirect
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      sessionExpired,
      showSessionAlert,
      signIn,
      signUp,
      signOut,
      refreshSession,
      dismissSessionAlert,
    }}>
      {children}
      <SessionAlert
        show={showSessionAlert}
        title="Sessão Expirada"
        message="Você ficou muito tempo inativo. Clique em 'Atualizar' para continuar usando o sistema."
        onRefresh={refreshSession}
        onDismiss={dismissSessionAlert}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}