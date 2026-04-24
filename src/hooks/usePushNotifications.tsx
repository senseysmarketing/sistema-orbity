import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, ReactNode } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { useToast } from '@/hooks/use-toast';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Anti-spam: token só é re-salvo se mudar OU após 12h
const TOKEN_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const LS_TOKEN_KEY = 'orbity_last_saved_push_token';
const LS_TOKEN_TS_KEY = 'orbity_last_saved_push_token_at';

const isStandalone = (): boolean => {
  if ((navigator as any).standalone === true) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  return false;
};

const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isAndroid = (): boolean => {
  return /android/i.test(navigator.userAgent);
};

const getDeviceType = (): string => {
  const ios = isIOS();
  const android = isAndroid();
  const standalone = isStandalone();
  
  if (ios) return standalone ? 'ios-pwa' : 'ios-browser';
  if (android) return standalone ? 'android-pwa' : 'android-browser';
  return standalone ? 'desktop-pwa' : 'desktop-browser';
};

interface PushNotificationContextType {
  permission: NotificationPermission;
  token: string | null;
  isSupported: boolean;
  isLoading: boolean;
  hasFirebaseConfig: boolean;
  isStandaloneMode: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  requestPermission: () => Promise<string | null>;
  disablePushNotifications: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  
  const firebaseAppRef = useRef<FirebaseApp | null>(null);
  const messagingRef = useRef<Messaging | null>(null);
  const saveTokenRef = useRef<(token: string) => Promise<void>>();
  const toastRef = useRef(toast);
  
  const platformInfo = useMemo(() => ({
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isStandalone: isStandalone(),
  }), []);
  
  toastRef.current = toast;

  const hasFirebaseConfig = Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.messagingSenderId &&
    VAPID_KEY
  );

  useEffect(() => {
    const checkSupport = async () => {
      const standalone = isStandalone();
      setIsStandaloneMode(standalone);
      console.log('[Push] Standalone mode:', standalone);

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[Push] Browser does not support push notifications');
        setIsSupported(false);
        return;
      }

      if (!hasFirebaseConfig) {
        console.log('[Push] Firebase config not available');
        setIsSupported(false);
        return;
      }

      setIsSupported(true);
      setPermission(Notification.permission);

      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        console.log('[Push] Service worker registered:', registration.scope);

        if (registration.waiting) {
          console.log('[Push] SW waiting, sending SKIP_WAITING');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        if (registration.installing) {
          console.log('[Push] SW installing, waiting for activation...');
          await new Promise<void>((resolve) => {
            const sw = registration.installing!;
            sw.addEventListener('statechange', () => {
              if (sw.state === 'activated') {
                console.log('[Push] SW activated successfully');
                resolve();
              }
            });
            setTimeout(resolve, 5000);
          });
        }

        if (registration.active) {
          registration.active.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig,
          });
        }
      } catch (error) {
        console.error('[Push] Service worker registration failed:', error);
      }
    };

    checkSupport();
  }, [hasFirebaseConfig]);

  const getFirebaseApp = useCallback(() => {
    if (firebaseAppRef.current) return firebaseAppRef.current;
    const apps = getApps();
    if (apps.length > 0) {
      firebaseAppRef.current = apps[0];
    } else {
      firebaseAppRef.current = initializeApp(firebaseConfig);
    }
    return firebaseAppRef.current;
  }, []);

  const getFirebaseMessaging = useCallback(() => {
    if (messagingRef.current) return messagingRef.current;
    const app = getFirebaseApp();
    messagingRef.current = getMessaging(app);
    return messagingRef.current;
  }, [getFirebaseApp]);

  const saveToken = useCallback(async (fcmToken: string) => {
    if (!user || !currentAgency) {
      console.log('[Push] Cannot save token - no user or agency');
      return;
    }

    const standalone = isStandalone();
    const ios = isIOS();
    const android = isAndroid();
    const deviceType = getDeviceType();

    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      standalone,
      displayMode: standalone ? 'standalone' : 'browser',
      isIOS: ios,
      isAndroid: android,
      deviceType,
      generatedAt: new Date().toISOString(),
    };

    try {
      // Guardrail anti-spam: skip se token igual e salvo há < 12h
      try {
        const cachedToken = localStorage.getItem(LS_TOKEN_KEY);
        const cachedAt = Number(localStorage.getItem(LS_TOKEN_TS_KEY) || '0');
        if (cachedToken === fcmToken && cachedAt && (Date.now() - cachedAt) < TOKEN_REFRESH_INTERVAL_MS) {
          console.log('[Push] Token cache hit (< 12h), skipping DB save');
          return;
        }
      } catch {}

      const { data: existingToken } = await supabase
        .from('push_subscriptions')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('fcm_token', fcmToken)
        .maybeSingle();

      if (existingToken && !existingToken.is_active) {
        console.log('[Push] Reativando token existente que estava inativo');
        const { error: reactivateError } = await supabase
          .from('push_subscriptions')
          .update({ 
            is_active: true,
            agency_id: currentAgency.id,
            device_info: deviceInfo,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingToken.id);
        
        if (!reactivateError) {
          console.log(`[Push] Token reativado com sucesso para ${deviceType}`);
          return;
        } else {
          console.warn('[Push] Erro ao reativar token:', reactivateError);
        }
      }

      const { data: activeTokens } = await supabase
        .from('push_subscriptions')
        .select('id, fcm_token, device_info')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (activeTokens && activeTokens.length > 0) {
        const tokensToDeactivate = activeTokens.filter(sub => {
          if (sub.fcm_token === fcmToken) return false;
          const existingDeviceType = (sub.device_info as any)?.deviceType;
          return existingDeviceType === deviceType;
        });

        if (tokensToDeactivate.length > 0) {
          const idsToDeactivate = tokensToDeactivate.map(t => t.id);
          const { error: deactivateError } = await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .in('id', idsToDeactivate);
          
          if (deactivateError) {
            console.warn('[Push] Error deactivating old tokens:', deactivateError);
          } else {
            console.log(`[Push] Deactivated ${tokensToDeactivate.length} old ${deviceType} tokens`);
          }
        }
      }

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        agency_id: currentAgency.id,
        fcm_token: fcmToken,
        device_info: deviceInfo,
        platform: 'web',
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id,fcm_token' 
      });

      if (error) {
        console.error('[Push] Error saving token:', error);
        throw error;
      }
      
      console.log(`[Push] Token saved for ${deviceType} (standalone: ${standalone})`);
    } catch (error) {
      console.error('[Push] Failed to save token:', error);
    }
  }, [user, currentAgency]);

  saveTokenRef.current = saveToken;

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Notificações não suportadas",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return null;
    }

    const ios = isIOS();
    const standalone = isStandalone();
    
    if (ios && !standalone) {
      toast({
        title: "Abra pela PWA instalada",
        description: "No iPhone, notificações só funcionam quando você abre o app pelo ícone na tela inicial (não pelo Safari).",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir notificações para receber alertas.",
          variant: "destructive",
        });
        return null;
      }

      const messaging = getFirebaseMessaging();
      const swRegistration = await navigator.serviceWorker.ready;
      
      console.log('[Push] Using SW registration:', swRegistration.scope);
      
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });

      if (!fcmToken) {
        throw new Error('Failed to get FCM token');
      }

      console.log('[Push] FCM token obtained:', fcmToken.substring(0, 20) + '...');
      
      await saveToken(fcmToken);
      setToken(fcmToken);

      toast({
        title: "Notificações ativadas! 🔔",
        description: standalone 
          ? "Você receberá alertas mesmo com o app em segundo plano."
          : "Notificações ativadas. Para melhor experiência, instale o app.",
      });

      return fcmToken;
    } catch (error: any) {
      console.error('[Push] Error requesting permission:', error);
      toast({
        title: "Erro ao ativar notificações",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, getFirebaseMessaging, saveToken, toast]);

  const disablePushNotifications = useCallback(async () => {
    if (!user || !token) return;

    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('fcm_token', token);

      if (error) throw error;

      setToken(null);
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais notificações push.",
      });
    } catch (error) {
      console.error('[Push] Error disabling notifications:', error);
    }
  }, [user, token, toast]);

  useEffect(() => {
    if (!isSupported || permission !== 'granted' || !hasFirebaseConfig) return;

    try {
      const messaging = getFirebaseMessaging();
      
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('[Push] Foreground message received:', payload);
        
        toastRef.current({
          title: payload.notification?.title || 'Nova notificação',
          description: payload.notification?.body,
        });

        if (payload.data?.play_sound === 'true') {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('[Push] Error setting up foreground listener:', error);
    }
  }, [isSupported, permission, hasFirebaseConfig, getFirebaseMessaging]);

  useEffect(() => {
    let didLoad = false;
    
    const loadExistingToken = async () => {
      if (didLoad) return;
      if (!user || !isSupported || permission !== 'granted' || !hasFirebaseConfig) return;

      didLoad = true;

      try {
        const messaging = getFirebaseMessaging();
        const registration = await navigator.serviceWorker.ready;
        
        const existingToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (existingToken) {
          console.log('[Push] Existing token found');
          setToken(existingToken);
          if (saveTokenRef.current) {
            await saveTokenRef.current(existingToken);
          }
        }
      } catch (error) {
        console.error('[Push] Error loading existing token:', error);
      }
    };

    loadExistingToken();
    
    return () => {
      didLoad = true;
    };
  }, [user?.id, isSupported, permission, hasFirebaseConfig, getFirebaseMessaging]);

  return (
    <PushNotificationContext.Provider value={{
      permission,
      token,
      isSupported,
      isLoading,
      hasFirebaseConfig,
      isStandaloneMode,
      isIOS: platformInfo.isIOS,
      isAndroid: platformInfo.isAndroid,
      requestPermission,
      disablePushNotifications,
    }}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
}
