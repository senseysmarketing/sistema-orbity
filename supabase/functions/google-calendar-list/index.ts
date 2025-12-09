import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshAccessToken(connection: any, supabase: any): Promise<string> {
  console.log("Refreshing access token...");
  
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    console.error("Token refresh error:", tokenData);
    throw new Error("Failed to refresh access token");
  }

  const { access_token, expires_in } = tokenData;
  const tokenExpiry = new Date(Date.now() + expires_in * 1000);

  await supabase
    .from("google_calendar_connections")
    .update({
      access_token,
      token_expiry: tokenExpiry.toISOString(),
    })
    .eq("id", connection.id);

  return access_token;
}

async function getValidAccessToken(connection: any, supabase: any): Promise<string> {
  const tokenExpiry = new Date(connection.token_expiry);
  const now = new Date();
  
  if (tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log("Token expiring soon, refreshing...");
    return await refreshAccessToken(connection, supabase);
  }
  
  return connection.access_token;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    console.log("Fetching calendars for user:", user.id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: connection, error: connError } = await supabase
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      console.log("No Google Calendar connection found");
      return new Response(
        JSON.stringify({ error: "No Google Calendar connection", calendars: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getValidAccessToken(connection, supabase);

    // Fetch calendar list from Google
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const result = await response.json();

    if (result.error) {
      console.error("Google Calendar API error:", result.error);
      throw new Error(result.error.message || "Failed to fetch calendars");
    }

    const calendars: GoogleCalendar[] = (result.items || []).map((cal: any) => ({
      id: cal.id,
      summary: cal.summary || cal.id,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      accessRole: cal.accessRole,
      description: cal.description,
    }));

    console.log(`Found ${calendars.length} calendars with write access`);

    return new Response(
      JSON.stringify({ 
        calendars,
        selected_calendar_id: connection.calendar_id || "primary",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error listing calendars:", error);
    return new Response(
      JSON.stringify({ error: error.message, calendars: [] }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});