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

interface MeetingData {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  google_calendar_event_id?: string;
  external_participants?: Array<{ name: string; email: string }>;
}

async function refreshAccessToken(connection: any, supabase: any): Promise<string> {
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

  // Update tokens in database
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
  
  // Refresh if token expires in less than 5 minutes
  if (tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log("Token expiring soon, refreshing...");
    return await refreshAccessToken(connection, supabase);
  }
  
  return connection.access_token;
}

async function createGoogleCalendarEvent(
  accessToken: string,
  meeting: MeetingData
): Promise<{ eventId: string; meetLink: string }> {
  const event = {
    summary: meeting.title,
    description: meeting.description || "",
    location: meeting.location || "",
    start: {
      dateTime: meeting.start_time,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: meeting.end_time,
      timeZone: "America/Sao_Paulo",
    },
    attendees: meeting.external_participants?.map(p => ({
      email: p.email,
      displayName: p.name,
    })) || [],
    conferenceData: {
      createRequest: {
        requestId: `orbity-${meeting.id}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const result = await response.json();

  if (result.error) {
    console.error("Google Calendar API error:", result.error);
    throw new Error(result.error.message || "Failed to create event");
  }

  return {
    eventId: result.id,
    meetLink: result.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri || "",
  };
}

async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  meeting: MeetingData
): Promise<void> {
  const event = {
    summary: meeting.title,
    description: meeting.description || "",
    location: meeting.location || "",
    start: {
      dateTime: meeting.start_time,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: meeting.end_time,
      timeZone: "America/Sao_Paulo",
    },
    attendees: meeting.external_participants?.map(p => ({
      email: p.email,
      displayName: p.name,
    })) || [],
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const result = await response.json();

  if (result.error) {
    console.error("Google Calendar API error:", result.error);
    throw new Error(result.error.message || "Failed to update event");
  }
}

async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const result = await response.json();
    console.error("Google Calendar API error:", result.error);
    throw new Error(result.error?.message || "Failed to delete event");
  }
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

    const { action, meeting } = await req.json();

    if (!action || !meeting) {
      throw new Error("Missing action or meeting data");
    }

    // Get user's Google Calendar connection
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: connection, error: connError } = await supabase
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("sync_enabled", true)
      .single();

    if (connError || !connection) {
      console.log("No active Google Calendar connection for user:", user.id);
      return new Response(
        JSON.stringify({ synced: false, reason: "no_connection" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getValidAccessToken(connection, supabase);

    let result: any = { synced: true };

    switch (action) {
      case "create": {
        const { eventId, meetLink } = await createGoogleCalendarEvent(accessToken, meeting);
        result = { synced: true, eventId, meetLink };
        
        // Update meeting with Google Calendar event ID
        await supabase
          .from("meetings")
          .update({ 
            google_calendar_event_id: eventId,
            google_meet_link: meetLink || meeting.google_meet_link,
          })
          .eq("id", meeting.id);
        
        console.log("Created Google Calendar event:", eventId);
        break;
      }
      case "update": {
        if (meeting.google_calendar_event_id) {
          await updateGoogleCalendarEvent(accessToken, meeting.google_calendar_event_id, meeting);
          console.log("Updated Google Calendar event:", meeting.google_calendar_event_id);
        }
        break;
      }
      case "delete": {
        if (meeting.google_calendar_event_id) {
          await deleteGoogleCalendarEvent(accessToken, meeting.google_calendar_event_id);
          console.log("Deleted Google Calendar event:", meeting.google_calendar_event_id);
        }
        break;
      }
      default:
        throw new Error("Invalid action");
    }

    // Update last_sync_at
    await supabase
      .from("google_calendar_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message, synced: false }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
