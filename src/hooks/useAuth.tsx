import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  dismissSessionAlert: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showSessionAlert, setShowSessionAlert] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const { toast } = useToast();

  const currentUserIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const authSequenceRef = useRef(0);
  const profileRef = useRef<Profile | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const loadProfile = async (userId: string, sequence: number) => {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (sequence !== authSequenceRef.current) return;

    if (error) {
      console.error('[Auth] Error loading profile:', {
        user_id: userId,
        message: error.message,
        code: error.code,
      });
      setProfile(null);
      return;
    }

    setProfile((profileData as Profile) || null);
  };

  const applySession = async (
    source: string,
    newSession: Session | null,
    options: { refetchProfile?: boolean } = {}
  ) => {
    const sequence = ++authSequenceRef.current;
    const newUser = newSession?.user ?? null;
    const newUserId = newUser?.id ?? null;
    const previousUserId = currentUserIdRef.current;

    console.log('[Auth] Session update:', {
      source,
      previous_user_id: previousUserId,
      next_user_id: newUserId,
      has_session: !!newSession,
    });

    currentUserIdRef.current = newUserId;
    sessionRef.current = newSession;
    setSession(newSession);
    setUser(newUser);

    if (!newUser) {
      setProfile(null);
      setSessionExpired(false);
      setShowSessionAlert(false);
      setLoading(false);
      return;
    }

    setLastActivityTime(Date.now());
    setSessionExpired(false);
    setShowSessionAlert(false);

    const shouldLoadProfile = options.refetchProfile || newUserId !== previousUserId || !profileRef.current;
    if (shouldLoadProfile) {
      await loadProfile(newUser.id, sequence);
    }

    if (sequence === authSequenceRef.current) {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      await applySession('manual_refresh', data.session, { refetchProfile: true });

      toast({
        title: "Sessao atualizada",
        description: "Seus dados foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error('[Auth] Error refreshing session:', error);
      setSessionExpired(true);
      setShowSessionAlert(true);
    }
  };

  const dismissSessionAlert = () => {
    setShowSessionAlert(false);
  };

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

    const interval = setInterval(checkSessionExpiry, 60000);
    return () => clearInterval(interval);
  }, [user, session, lastActivityTime]);

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
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          void applySession(event, null);
          return;
        }

        const shouldRefetchProfile =
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED';

        void applySession(event, newSession, { refetchProfile: shouldRefetchProfile });
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session: existingSession }, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('[Auth] Error getting initial session:', error);
          void applySession('getSession_error', null);
          return;
        }
        void applySession('getSession', existingSession, { refetchProfile: true });
      })
      .catch((error) => {
        console.error('[Auth] Unexpected getSession failure:', error);
        if (mounted) void applySession('getSession_exception', null);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] signIn failed:', { email, message: error.message, code: error.code });
        toast({
          title: "Erro no login",
          description: error.message === 'Invalid login credentials'
            ? "Credenciais invalidas. Verifique seu email e senha."
            : error.message,
          variant: "destructive",
        });
      } else {
        console.log('[Auth] signIn successful:', { email });
        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta ao Orbity.",
        });
      }

      return { error };
    } catch (error: unknown) {
      console.error('[Auth] Unexpected signIn error:', error);
      toast({
        title: "Erro no login",
        description: getErrorMessage(error, "Ocorreu um erro inesperado. Tente novamente."),
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
        console.error('[Auth] signUp failed:', { email, message: error.message, code: error.code });
        toast({
          title: "Erro no cadastro",
          description: error.message === 'User already registered'
            ? "Este email ja esta cadastrado. Tente fazer login."
            : error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta criada!",
          description: "Sua conta foi criada com sucesso. Faca login para continuar.",
        });
      }

      return { error };
    } catch (error: unknown) {
      console.error('[Auth] Unexpected signUp error:', error);
      toast({
        title: "Erro no cadastro",
        description: getErrorMessage(error, "Ocorreu um erro inesperado. Tente novamente."),
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'global' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000))
      ]);
      console.log('[Auth] signOut completed successfully');
    } catch (error) {
      console.warn('[Auth] signOut timeout or error, proceeding with cleanup:', error);
    } finally {
      currentUserIdRef.current = null;
      sessionRef.current = null;
      authSequenceRef.current++;
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
        title="Sessao expirada"
        message="Voce ficou muito tempo inativo. Clique em Atualizar para continuar usando o sistema."
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
