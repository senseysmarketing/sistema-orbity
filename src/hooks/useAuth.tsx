import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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
  onboarding_completed?: boolean;
  tour_completed?: boolean;
  welcome_seen?: boolean;
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

  // Refs para evitar re-renders desnecessários
  const currentUserIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  // Session timeout: 2 hours
  const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      setLastActivityTime(Date.now());
      setSessionExpired(false);
      setShowSessionAlert(false);
      
      // Atualizar refs sem causar re-render se user não mudou
      sessionRef.current = data.session;
      
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
      async (event, newSession) => {
        // Guard: SIGNED_OUT ou session nula → limpar tudo e sair imediatamente
        if (event === 'SIGNED_OUT' || !newSession) {
          console.log('[Auth] SIGNED_OUT or null session — clearing all state');
          currentUserIdRef.current = null;
          sessionRef.current = null;
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return; // JAMAIS fazer fetch de profile aqui
        }

        // Eventos silenciosos que não devem causar re-render da árvore inteira
        const silentEvents = ['TOKEN_REFRESHED', 'INITIAL_SESSION'];
        
        if (silentEvents.includes(event)) {
          console.log('[Auth] Silent event:', event, '— updating ref only');
          sessionRef.current = newSession;
          // Ensure loading clears on INITIAL_SESSION
          if (event === 'INITIAL_SESSION') setLoading(false);
          return;
        }
        
        // Verificar se user realmente mudou antes de atualizar estado
        const newUserId = newSession?.user?.id || null;
        const currentUserId = currentUserIdRef.current;
        
        if (newUserId !== currentUserId) {
          // User actually changed — full state update + profile fetch
          console.log('[Auth] User changed:', currentUserId, '->', newUserId);
          currentUserIdRef.current = newUserId;
          sessionRef.current = newSession;
          
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            setLastActivityTime(Date.now());
            setSessionExpired(false);
            setShowSessionAlert(false);
            
            setTimeout(async () => {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', newSession.user.id)
                .single();
              
              if (profileData) {
                setProfile(profileData as Profile);
              }
            }, 0);
          } else {
            setProfile(null);
          }
        } else {
          // Same user (e.g. SIGNED_IN on tab refocus) — update ref silently
          console.log('[Auth] Same user, silent ref update for event:', event);
          sessionRef.current = newSession;
        }
        
        setLoading(false);
      }
    );

    // Check for existing session — skip profile fetch if listener already handled it
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      const existingUserId = existingSession?.user?.id || null;
      
      // If the onAuthStateChange listener already set this user, skip redundant work
      if (currentUserIdRef.current === existingUserId && existingUserId !== null) {
        // Profile fetch already triggered by listener, just ensure loading is cleared
        setLoading(false);
        return;
      }
      
      currentUserIdRef.current = existingUserId;
      sessionRef.current = existingSession;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', existingSession.user.id)
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
      const redirectUrl = `${window.location.origin}/dashboard`;
      
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
      // Executar signOut com timeout de 3s (fire-and-forget se Supabase travar)
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000))
      ]);
      console.log('[Auth] signOut completed successfully');
    } catch (error) {
      console.warn('[Auth] signOut timeout or error, proceeding with cleanup:', error);
    } finally {
      // Sempre limpar estado local e redirecionar
      currentUserIdRef.current = null;
      sessionRef.current = null;
      setUser(null);
      setSession(null);
      setProfile(null);
      setSessionExpired(false);
      setShowSessionAlert(false);
      setLoading(false);
      window.location.replace('/auth');
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