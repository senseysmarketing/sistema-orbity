import { useState, useEffect, useCallback, useRef } from 'react';
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

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  
  const firebaseAppRef = useRef<FirebaseApp | null>(null);
  const messagingRef = useRef<Messaging | null>(null);

  // Check if Firebase config is available
  const hasFirebaseConfig = Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.messagingSenderId &&
    VAPID_KEY
  );

  // Check support and initialize
  useEffect(() => {
    const checkSupport = async () => {
      // Check if browser supports push notifications
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[Push] Browser does not support push notifications');
        setIsSupported(false);
        return;
      }

      // Check if Firebase config is available
      if (!hasFirebaseConfig) {
        console.log('[Push] Firebase config not available');
        setIsSupported(false);
        return;
      }

      setIsSupported(true);
      setPermission(Notification.permission);

      // Register service worker
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('[Push] Service worker registered:', registration.scope);

        // Send Firebase config to service worker
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

  // Initialize Firebase app (singleton)
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

  // Get Firebase messaging instance
  const getFirebaseMessaging = useCallback(() => {
    if (messagingRef.current) return messagingRef.current;
    
    const app = getFirebaseApp();
    messagingRef.current = getMessaging(app);
    
    return messagingRef.current;
  }, [getFirebaseApp]);

  // Save token to Supabase
  const saveToken = useCallback(async (fcmToken: string) => {
    if (!user || !currentAgency) {
      console.log('[Push] Cannot save token - no user or agency');
      return;
    }

    try {
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        agency_id: currentAgency.id,
        fcm_token: fcmToken,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
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
      
      console.log('[Push] Token saved successfully');
    } catch (error) {
      console.error('[Push] Failed to save token:', error);
    }
  }, [user, currentAgency]);

  // Request permission and get token
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Notificações não suportadas",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);

    try {
      // Request notification permission
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

      // Get FCM token
      const messaging = getFirebaseMessaging();
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });

      if (!fcmToken) {
        throw new Error('Failed to get FCM token');
      }

      console.log('[Push] FCM token obtained:', fcmToken.substring(0, 20) + '...');
      
      // Save token to database
      await saveToken(fcmToken);
      setToken(fcmToken);

      toast({
        title: "Notificações ativadas! 🔔",
        description: "Você receberá alertas mesmo com o app em segundo plano.",
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

  // Disable push notifications
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

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported || permission !== 'granted' || !hasFirebaseConfig) return;

    try {
      const messaging = getFirebaseMessaging();
      
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('[Push] Foreground message received:', payload);
        
        // Show toast for foreground messages
        toast({
          title: payload.notification?.title || 'Nova notificação',
          description: payload.notification?.body,
        });

        // Optionally play sound
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
  }, [isSupported, permission, hasFirebaseConfig, getFirebaseMessaging, toast]);

  // Load existing token on mount
  useEffect(() => {
    const loadExistingToken = async () => {
      if (!user || !isSupported || permission !== 'granted' || !hasFirebaseConfig) return;

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
          // Re-save to ensure it's up to date
          await saveToken(existingToken);
        }
      } catch (error) {
        console.error('[Push] Error loading existing token:', error);
      }
    };

    loadExistingToken();
  }, [user, isSupported, permission, hasFirebaseConfig, getFirebaseMessaging, saveToken]);

  return {
    permission,
    token,
    isSupported,
    isLoading,
    hasFirebaseConfig,
    requestPermission,
    disablePushNotifications,
  };
}
