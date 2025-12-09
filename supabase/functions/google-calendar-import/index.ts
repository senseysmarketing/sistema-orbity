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

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: Array<{ uri: string; entryPointType: string }> };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error}`);
  }

  return data.access_token;
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

    const { days = 30 } = await req.json().catch(() => ({}));

    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get user's connection
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: connection, error: connError } = await supabaseAdmin
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      throw new Error("Google Calendar not connected");
    }

    // Refresh access token if needed
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expiry);
    
    if (tokenExpiry <= new Date()) {
      console.log("Token expired, refreshing...");
      accessToken = await refreshAccessToken(connection.refresh_token);
      
      // Update token in database
      await supabaseAdmin
        .from("google_calendar_connections")
        .update({
          access_token: accessToken,
          token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        })
        .eq("id", connection.id);
    }

    // Calculate time range
    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + days);

    // Fetch events from Google Calendar
    const calendarId = connection.calendar_id || "primary";
    const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    eventsUrl.searchParams.set("timeMin", timeMin.toISOString());
    eventsUrl.searchParams.set("timeMax", timeMax.toISOString());
    eventsUrl.searchParams.set("singleEvents", "true");
    eventsUrl.searchParams.set("orderBy", "startTime");
    eventsUrl.searchParams.set("maxResults", "100");

    const eventsResponse = await fetch(eventsUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.json();
      console.error("Google Calendar API error:", errorData);
      throw new Error("Failed to fetch events from Google Calendar");
    }

    const eventsData = await eventsResponse.json();
    const events: GoogleCalendarEvent[] = eventsData.items || [];

    console.log(`Found ${events.length} events in Google Calendar for next ${days} days`);

    // Get existing meetings with google_calendar_event_id
    const { data: existingMeetings } = await supabaseAdmin
      .from("meetings")
      .select("google_calendar_event_id")
      .eq("agency_id", connection.agency_id)
      .not("google_calendar_event_id", "is", null);

    const existingEventIds = new Set(existingMeetings?.map(m => m.google_calendar_event_id) || []);

    // Filter events that don't exist in Orbity
    const newEvents = events.filter(event => !existingEventIds.has(event.id));

    console.log(`${newEvents.length} new events to import`);

    // Import new events
    let importedCount = 0;
    const errors: string[] = [];

    for (const event of newEvents) {
      try {
        // Skip all-day events (they have date instead of dateTime)
        if (!event.start.dateTime || !event.end.dateTime) {
          console.log(`Skipping all-day event: ${event.summary}`);
          continue;
        }

        // Extract Google Meet link
        let meetLink = event.hangoutLink || null;
        if (!meetLink && event.conferenceData?.entryPoints) {
          const videoEntry = event.conferenceData.entryPoints.find(ep => ep.entryPointType === "video");
          if (videoEntry) {
            meetLink = videoEntry.uri;
          }
        }

        // Create meeting in Orbity
        const { error: insertError } = await supabaseAdmin
          .from("meetings")
          .insert({
            agency_id: connection.agency_id,
            title: event.summary || "Evento sem título",
            description: event.description || null,
            location: event.location || null,
            start_time: event.start.dateTime,
            end_time: event.end.dateTime,
            organizer_id: user.id,
            created_by: user.id,
            google_calendar_event_id: event.id,
            google_meet_link: meetLink,
            sync_to_google_calendar: true,
            status: "scheduled",
            meeting_type: "client",
            external_participants: event.attendees?.map(a => ({
              email: a.email,
              name: a.displayName || a.email,
            })) || [],
          });

        if (insertError) {
          console.error(`Error importing event ${event.id}:`, insertError);
          errors.push(`${event.summary}: ${insertError.message}`);
        } else {
          importedCount++;
          console.log(`Imported event: ${event.summary}`);
        }
      } catch (err) {
        console.error(`Error processing event ${event.id}:`, err);
        errors.push(`${event.summary}: ${err.message}`);
      }
    }

    // Update last_sync_at
    await supabaseAdmin
      .from("google_calendar_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        imported: importedCount,
        total_found: events.length,
        already_exists: events.length - newEvents.length,
        skipped: newEvents.length - importedCount - errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
