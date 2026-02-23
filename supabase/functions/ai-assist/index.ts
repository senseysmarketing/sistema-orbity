import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TASK_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_task_data",
      description: "Extraia dados estruturados de uma tarefa a partir da descrição do usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título conciso da tarefa" },
          description: { type: "string", description: "Descrição profissional e estruturada, sem erros de gramática" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioridade da tarefa" },
          suggested_type: { type: "string", description: "Sugestão de tipo baseado no contexto (ex: design, copy, video, social_media, trafego, reuniao, outro)" },
          mentioned_clients: { type: "array", items: { type: "string" }, description: "Nomes de clientes ou empresas mencionados pelo usuário no texto. Extraia apenas nomes próprios de pessoas ou empresas que pareçam ser clientes." },
        },
        required: ["title", "description", "priority"],
        additionalProperties: false,
      },
    },
  },
];

const POST_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_post_data",
      description: "Extraia dados de um post para redes sociais a partir da descrição do usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título interno do post" },
          description: { type: "string", description: "Legenda/caption envolvente e profissional" },
          platform: { type: "string", enum: ["instagram", "facebook", "linkedin", "twitter", "tiktok", "youtube"], description: "Plataforma sugerida" },
          post_type: { type: "string", enum: ["feed", "stories", "reels", "carrossel", "video"], description: "Tipo de conteúdo" },
          hashtags: { type: "array", items: { type: "string" }, description: "Hashtags relevantes" },
          mentioned_clients: { type: "array", items: { type: "string" }, description: "Nomes de clientes ou empresas mencionados pelo usuário no texto. Extraia apenas nomes próprios de pessoas ou empresas que pareçam ser clientes." },
        },
        required: ["title", "description", "platform", "post_type", "hashtags"],
        additionalProperties: false,
      },
    },
  },
];

const DEFAULT_TASK_PROMPT =
  "Você é um assistente de agência de marketing digital. Extraia os dados estruturados de uma tarefa a partir da descrição do usuário. Gere um título conciso e uma descrição profissional, estruturada e sem erros de gramática.";

const DEFAULT_POST_PROMPT =
  "Você é um social media manager profissional. Extraia os dados de um post para redes sociais a partir da descrição do usuário. Gere uma legenda envolvente, profissional e adaptada para a plataforma sugerida. Inclua hashtags relevantes.";

const TASK_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: Se o usuário mencionar nomes de clientes, empresas ou pessoas que pareçam ser clientes, extraia esses nomes no campo mentioned_clients. Responda sempre em português brasileiro.";

const POST_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: Se o usuário mencionar nomes de clientes, empresas ou pessoas que pareçam ser clientes, extraia esses nomes no campo mentioned_clients. Responda em português brasileiro.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, agency_id } = await req.json();

    if (!content || !type) {
      return new Response(JSON.stringify({ error: "type e content são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Fetch custom prompt if agency_id provided
    let customPrompt: string | null = null;
    if (agency_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);
        
        const promptType = type === "prefill_task" ? "task" : "post";
        const { data } = await sb
          .from("agency_ai_prompts")
          .select("custom_prompt")
          .eq("agency_id", agency_id)
          .eq("prompt_type", promptType)
          .maybeSingle();

        if (data?.custom_prompt) {
          customPrompt = data.custom_prompt;
        }
      } catch (e) {
        console.error("Error fetching custom prompt:", e);
        // Continue with default prompt
      }
    }

    let systemPrompt: string;
    let tools: any[];
    let toolChoice: any;

    if (type === "prefill_task") {
      const basePrompt = customPrompt || DEFAULT_TASK_PROMPT;
      systemPrompt = basePrompt + TASK_TECHNICAL_INSTRUCTIONS;
      tools = TASK_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_task_data" } };
    } else if (type === "prefill_post") {
      const basePrompt = customPrompt || DEFAULT_POST_PROMPT;
      systemPrompt = basePrompt + POST_TECHNICAL_INSTRUCTIONS;
      tools = POST_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_post_data" } };
    } else {
      return new Response(JSON.stringify({ error: "Tipo inválido. Use prefill_task ou prefill_post." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        tools,
        tool_choice: toolChoice,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta da IA sem dados estruturados");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
