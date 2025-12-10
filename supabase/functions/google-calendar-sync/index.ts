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
  participants?: string[]; // Internal participant user IDs
  organizer_id?: string;
}

interface ParticipantConnection {
  user_id: string;
  calendar_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  id: string;
  email?: string;
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

async function getParticipantEmails(supabase: any, userIds: string[]): Promise<Map<string, string>> {
  const emailMap = new Map<string, string>();
  
  if (!userIds || userIds.length === 0) return emailMap;
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, email")
    .in("user_id", userIds);
  
  if (profiles) {
    profiles.forEach((p: { user_id: string; email: string }) => {
      emailMap.set(p.user_id, p.email);
    });
  }
  
  return emailMap;
}

async function getParticipantConnections(
  supabase: any, 
  userIds: string[]
): Promise<ParticipantConnection[]> {
  if (!userIds || userIds.length === 0) return [];
  
  const { data: connections } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .in("user_id", userIds)
    .eq("sync_enabled", true);
  
  return connections || [];
}

function buildAttendeesList(
  externalParticipants: Array<{ name: string; email: string }> | undefined,
  internalEmails: Map<string, string>,
  excludeUserId?: string
): Array<{ email: string; displayName?: string }> {
  const attendees: Array<{ email: string; displayName?: string }> = [];
  
  // Add external participants
  if (externalParticipants) {
    externalParticipants.forEach(p => {
      attendees.push({ email: p.email, displayName: p.name });
    });
  }
  
  // Add internal participants
  internalEmails.forEach((email, userId) => {
    if (userId !== excludeUserId && email) {
      attendees.push({ email });
    }
  });
  
  return attendees;
}

async function createGoogleCalendarEvent(
  accessToken: string,
  meeting: MeetingData,
  calendarId: string = "primary",
  attendees: Array<{ email: string; displayName?: string }> = []
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
    attendees: attendees,
    conferenceData: {
      createRequest: {
        requestId: `orbity-${meeting.id}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const encodedCalendarId = encodeURIComponent(calendarId);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?conferenceDataVersion=1`,
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
  meeting: MeetingData,
  calendarId: string = "primary",
  attendees: Array<{ email: string; displayName?: string }> = []
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
    attendees: attendees,
  };

  const encodedCalendarId = encodeURIComponent(calendarId);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${eventId}`,
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
  eventId: string,
  calendarId: string = "primary"
): Promise<void> {
  const encodedCalendarId = encodeURIComponent(calendarId);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${eventId}`,
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all user IDs involved (organizer + participants)
    const allUserIds = new Set<string>();
    if (meeting.organizer_id) allUserIds.add(meeting.organizer_id);
    if (meeting.participants) {
      meeting.participants.forEach((id: string) => allUserIds.add(id));
    }
    // Include current user (who might be the organizer creating the meeting)
    allUserIds.add(user.id);

    const userIdsArray = Array.from(allUserIds);
    
    // Get participant emails for attendees list
    const participantEmails = await getParticipantEmails(supabase, userIdsArray);
    
    // Get all connections for users with sync enabled
    const participantConnections = await getParticipantConnections(supabase, userIdsArray);
    
    console.log(`Found ${participantConnections.length} connections for ${userIdsArray.length} users`);

    if (participantConnections.length === 0) {
      console.log("No active Google Calendar connections found");
      return new Response(
        JSON.stringify({ synced: false, reason: "no_connections" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build attendees list with all participants
    const attendees = buildAttendeesList(
      meeting.external_participants,
      participantEmails
    );

    let result: any = { synced: true, syncedUsers: [] };
    let meetLink = "";

    switch (action) {
      case "create": {
        // Create event in each participant's calendar
        for (const connection of participantConnections) {
          try {
            const accessToken = await getValidAccessToken(connection, supabase);
            const calendarId = connection.calendar_id || "primary";
            
            const { eventId, meetLink: newMeetLink } = await createGoogleCalendarEvent(
              accessToken, 
              meeting, 
              calendarId,
              attendees
            );
            
            // Store the first meet link for the meeting
            if (!meetLink && newMeetLink) {
              meetLink = newMeetLink;
            }

            // Save event ID for this user
            await supabase
              .from("meeting_calendar_events")
              .upsert({
                meeting_id: meeting.id,
                user_id: connection.user_id,
                google_calendar_event_id: eventId,
                calendar_id: calendarId,
              });

            result.syncedUsers.push(connection.user_id);
            console.log(`Created event for user ${connection.user_id}: ${eventId}`);

            // Update last_sync_at
            await supabase
              .from("google_calendar_connections")
              .update({ last_sync_at: new Date().toISOString() })
              .eq("id", connection.id);
          } catch (err) {
            console.error(`Failed to create event for user ${connection.user_id}:`, err);
            // Continue with other users
          }
        }

        // Update meeting with meet link (use the first created one)
        if (meetLink || result.syncedUsers.length > 0) {
          const updateData: any = {};
          if (meetLink) updateData.google_meet_link = meetLink;
          
          // Store the organizer's event ID in the meeting for backward compatibility
          const organizerEvent = await supabase
            .from("meeting_calendar_events")
            .select("google_calendar_event_id")
            .eq("meeting_id", meeting.id)
            .eq("user_id", meeting.organizer_id || user.id)
            .single();
          
          if (organizerEvent.data) {
            updateData.google_calendar_event_id = organizerEvent.data.google_calendar_event_id;
          }
          
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("meetings")
              .update(updateData)
              .eq("id", meeting.id);
          }
        }

        result.meetLink = meetLink;
        break;
      }
      
      case "update": {
        // Get all existing calendar events for this meeting
        const { data: existingEvents } = await supabase
          .from("meeting_calendar_events")
          .select("*")
          .eq("meeting_id", meeting.id);

        const existingEventMap = new Map(
          (existingEvents || []).map((e: any) => [e.user_id, e])
        );

        // Update events for existing connections
        for (const connection of participantConnections) {
          try {
            const accessToken = await getValidAccessToken(connection, supabase);
            const calendarId = connection.calendar_id || "primary";
            const existingEvent = existingEventMap.get(connection.user_id);

            if (existingEvent) {
              // Update existing event
              await updateGoogleCalendarEvent(
                accessToken,
                existingEvent.google_calendar_event_id,
                meeting,
                calendarId,
                attendees
              );
              console.log(`Updated event for user ${connection.user_id}`);
            } else {
              // Create new event for newly added participant
              const { eventId } = await createGoogleCalendarEvent(
                accessToken,
                meeting,
                calendarId,
                attendees
              );

              await supabase
                .from("meeting_calendar_events")
                .insert({
                  meeting_id: meeting.id,
                  user_id: connection.user_id,
                  google_calendar_event_id: eventId,
                  calendar_id: calendarId,
                });
              console.log(`Created new event for added participant ${connection.user_id}: ${eventId}`);
            }

            result.syncedUsers.push(connection.user_id);
            existingEventMap.delete(connection.user_id);

            await supabase
              .from("google_calendar_connections")
              .update({ last_sync_at: new Date().toISOString() })
              .eq("id", connection.id);
          } catch (err) {
            console.error(`Failed to update event for user ${connection.user_id}:`, err);
          }
        }

        // Delete events for removed participants
        for (const [removedUserId, removedEvent] of existingEventMap) {
          try {
            const { data: removedConnection } = await supabase
              .from("google_calendar_connections")
              .select("*")
              .eq("user_id", removedUserId)
              .single();

            if (removedConnection) {
              const accessToken = await getValidAccessToken(removedConnection, supabase);
              await deleteGoogleCalendarEvent(
                accessToken,
                (removedEvent as any).google_calendar_event_id,
                (removedEvent as any).calendar_id || "primary"
              );
            }

            await supabase
              .from("meeting_calendar_events")
              .delete()
              .eq("id", (removedEvent as any).id);
              
            console.log(`Deleted event for removed participant ${removedUserId}`);
          } catch (err) {
            console.error(`Failed to delete event for removed user ${removedUserId}:`, err);
          }
        }
        break;
      }
      
      case "delete": {
        // Get all calendar events for this meeting
        const { data: allEvents } = await supabase
          .from("meeting_calendar_events")
          .select("*")
          .eq("meeting_id", meeting.id);

        // Delete from each user's calendar
        for (const eventRecord of (allEvents || [])) {
          try {
            const { data: connection } = await supabase
              .from("google_calendar_connections")
              .select("*")
              .eq("user_id", eventRecord.user_id)
              .single();

            if (connection) {
              const accessToken = await getValidAccessToken(connection, supabase);
              await deleteGoogleCalendarEvent(
                accessToken,
                eventRecord.google_calendar_event_id,
                eventRecord.calendar_id || "primary"
              );
              console.log(`Deleted event for user ${eventRecord.user_id}`);
            }
          } catch (err) {
            console.error(`Failed to delete event for user ${eventRecord.user_id}:`, err);
          }
        }

        // Clean up meeting_calendar_events table (cascade should handle this, but just in case)
        await supabase
          .from("meeting_calendar_events")
          .delete()
          .eq("meeting_id", meeting.id);
        break;
      }
      
      default:
        throw new Error("Invalid action");
    }

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
