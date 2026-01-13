// Meta Pixel Implementation
// Pixel ID: 1424126292770193

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

const PIXEL_ID = '1424126292770193';

// Inicializar o Meta Pixel
export const initMetaPixel = () => {
  if (typeof window === 'undefined') return;
  
  // Evitar inicialização duplicada
  if (window.fbq) return;

  // Código oficial do Meta Pixel
  (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
  
  console.log('[Meta Pixel] Initialized with ID:', PIXEL_ID);
};

// Rastrear PageView (para navegação SPA)
export const trackPageView = () => {
  if (window.fbq) {
    window.fbq('track', 'PageView');
  }
};

// Evento Lead - Após cadastro no onboarding
export const trackLead = (data?: {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
}) => {
  if (window.fbq) {
    window.fbq('track', 'Lead', {
      content_name: data?.content_name || 'Onboarding Signup',
      content_category: data?.content_category || 'Agency Registration',
      value: data?.value,
      currency: data?.currency || 'BRL',
    });
    console.log('[Meta Pixel] Lead event tracked:', data);
  }
};

// Evento Purchase - Após compra Stripe
export const trackPurchase = (data: {
  value: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
}) => {
  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      value: data.value,
      currency: data.currency || 'BRL',
      content_name: data.content_name || 'Subscription',
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
    });
    console.log('[Meta Pixel] Purchase event tracked:', data);
  }
};

// Evento InitiateCheckout - Quando inicia o checkout
export const trackInitiateCheckout = (data?: {
  value?: number;
  currency?: string;
  content_name?: string;
}) => {
  if (window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      value: data?.value,
      currency: data?.currency || 'BRL',
      content_name: data?.content_name,
    });
    console.log('[Meta Pixel] InitiateCheckout event tracked:', data);
  }
};

// Evento ViewContent - Visualização de página importante
export const trackViewContent = (data?: {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  value?: number;
}) => {
  if (window.fbq) {
    window.fbq('track', 'ViewContent', data);
    console.log('[Meta Pixel] ViewContent event tracked:', data);
  }
};

// Evento CompleteRegistration - Registro completo
export const trackCompleteRegistration = (data?: {
  content_name?: string;
  value?: number;
  currency?: string;
}) => {
  if (window.fbq) {
    window.fbq('track', 'CompleteRegistration', {
      content_name: data?.content_name,
      value: data?.value,
      currency: data?.currency || 'BRL',
    });
    console.log('[Meta Pixel] CompleteRegistration event tracked:', data);
  }
};
