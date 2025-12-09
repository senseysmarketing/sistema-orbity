import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Default fallback URL
const DEFAULT_APP_URL = "https://5e673624-82f5-40bc-b4a6-0e7016e553ab.lovableproject.com";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Default app URL - will be overridden by state if available
    let appUrl = DEFAULT_APP_URL;

    // Try to parse state early to get origin_url
    let stateData: { user_id?: string; agency_id?: string; origin_url?: string } = {};
    if (state) {
      try {
        stateData = JSON.parse(atob(state));
        if (stateData.origin_url) {
          appUrl = stateData.origin_url;
        }
      } catch (e) {
        console.error("Error parsing state for origin_url:", e);
      }
    }

    if (error) {
      console.error("OAuth error:", error);
      return Response.redirect(`${appUrl}/settings?google_calendar=error&message=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error("Missing code or state");
      return Response.redirect(`${appUrl}/settings?google_calendar=error&message=missing_params`);
    }

    const { user_id, agency_id } = stateData;

    if (!user_id || !agency_id) {
      console.error("Missing user_id or agency_id in state");
      return Response.redirect(`${appUrl}/settings?google_calendar=error&message=invalid_state_data`);
    }

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
    
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return Response.redirect(`${appUrl}/settings?google_calendar=error&message=${encodeURIComponent(tokenData.error)}`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info (email)
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    // Save to database using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upsert connection
    const { error: upsertError } = await supabase
      .from("google_calendar_connections")
      .upsert({
        user_id,
        agency_id,
        access_token,
        refresh_token,
        token_expiry: tokenExpiry.toISOString(),
        connected_email: userInfo.email,
        sync_enabled: true,
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Database error:", upsertError);
      return Response.redirect(`${appUrl}/settings?google_calendar=error&message=database_error`);
    }

    console.log("Successfully connected Google Calendar for user:", user_id, "email:", userInfo.email);

    return Response.redirect(`${appUrl}/settings?google_calendar=success`);
  } catch (error) {
    console.error("Callback error:", error);
    return Response.redirect(`${DEFAULT_APP_URL}/settings?google_calendar=error&message=server_error`);
  }
});
