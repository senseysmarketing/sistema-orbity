import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

// Cache for access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Parse PEM-encoded private key and return the raw key bytes
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM header/footer and whitespace
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
    .replace(/-----END RSA PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  // Decode base64
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Base64url encode (RFC 4648)
 */
function base64urlEncode(data: string | Uint8Array): string {
  let base64: string;
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    base64 = btoa(String.fromCharCode(...data));
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Get OAuth2 access token from Firebase service account
 */
async function getAccessToken(): Promise<string> {
  // Check cache first
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    console.log('[FCM] Using cached access token');
    return cachedAccessToken.token;
  }

  console.log('[FCM] Generating new access token...');
  
  const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!serviceAccountStr) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountStr);
  } catch (e) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
  }

  if (!serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Invalid service account: missing private_key or client_email');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Create JWT claim set
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
  };

  // Encode header and claim
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedClaim = base64urlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Import the private key
  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the JWT
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );
  const signature = base64urlEncode(new Uint8Array(signatureBuffer));

  // Create the JWT
  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('[FCM] Token exchange failed:', errorText);
    throw new Error(`Token exchange failed: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  
  // Cache the token
  cachedAccessToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + (tokenData.expires_in * 1000),
  };

  console.log('[FCM] Access token obtained successfully');
  return tokenData.access_token;
}

/**
 * Send push notification via FCM HTTP v1 API
 */
async function sendToFCM(
  fcmToken: string, 
  payload: PushPayload, 
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID not configured');
  }

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          icon: payload.icon || '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
        fcm_options: {
          link: payload.data?.action_url || '/dashboard',
        },
      },
      data: {
        ...payload.data,
        click_action: payload.data?.action_url || '/dashboard',
      },
    },
  };

  console.log('[FCM] Sending message to token:', fcmToken.substring(0, 20) + '...');

  const response = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (response.ok) {
    const result = await response.json();
    console.log('[FCM] Message sent successfully:', result.name);
    return { success: true };
  } else {
    const errorBody = await response.text();
    console.error('[FCM] Send failed:', response.status, errorBody);
    
    // Handle invalid tokens
    if (response.status === 404 || errorBody.includes('UNREGISTERED')) {
      // Mark token as inactive
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('fcm_token', fcmToken);
      console.log('[FCM] Marked invalid token as inactive');
    }
    
    return { success: false, error: errorBody };
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: PushPayload = await req.json();
    
    console.log('[FCM] Processing push notification for user:', payload.user_id);

    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active FCM tokens for the user
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', payload.user_id)
      .eq('is_active', true);

    if (fetchError) {
      console.error('[FCM] Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[FCM] No active push subscriptions for user');
      return new Response(
        JSON.stringify({ sent: 0, total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[FCM] Found ${subscriptions.length} active subscriptions`);

    // Get access token
    const accessToken = await getAccessToken();

    // Send to all devices
    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const result = await sendToFCM(sub.fcm_token, payload, accessToken);
        if (result.success) {
          sent++;
        } else if (result.error) {
          errors.push(result.error);
        }
      } catch (e: any) {
        console.error('[FCM] Error sending to token:', e.message);
        errors.push(e.message);
      }
    }

    console.log(`[FCM] Push notifications sent: ${sent}/${subscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        sent, 
        total: subscriptions.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[FCM] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
