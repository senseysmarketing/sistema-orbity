import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const headers = { "Content-Type": "application/json" };

serve(async () => new Response(JSON.stringify({
  success: true,
  disabled: true,
  processed: 0,
  replacement: "process-automation-pending-actions",
}), { headers }));
