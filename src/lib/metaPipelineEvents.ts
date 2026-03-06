import { supabase } from "@/integrations/supabase/client";

// Maps CRM database status to Meta standard event name
const PIPELINE_META_EVENTS: Record<string, string> = {
  scheduled: 'Schedule',
  proposal: 'SubmitApplication',
  won: 'Purchase',
};

/**
 * Fires a Meta Conversions API event when a lead changes pipeline status.
 * Runs in background — does not block UI.
 */
export function firePipelineMetaEvent(
  leadId: string,
  agencyId: string,
  newDbStatus: string,
  leadValue?: number
) {
  const metaEvent = PIPELINE_META_EVENTS[newDbStatus];
  if (!metaEvent) return; // No event mapped for this status

  // Fire and forget — don't await
  supabase.functions.invoke('process-lead-qualification', {
    body: {
      lead_id: leadId,
      agency_id: agencyId,
      pipeline_event: newDbStatus,
      event_name: metaEvent,
      value: leadValue,
    },
  }).then(({ error }) => {
    if (error) {
      console.warn(`[Meta Pipeline Event] Failed to fire ${metaEvent} for lead ${leadId}:`, error);
    } else {
      console.log(`[Meta Pipeline Event] ${metaEvent} dispatched for lead ${leadId}`);
    }
  });
}
