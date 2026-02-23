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
          mentioned_users: { type: "array", items: { type: "string" }, description: "Nomes de pessoas mencionadas como responsáveis ou que devem executar a tarefa. Extraia nomes próprios de pessoas que o usuário indica como executores (ex: 'a Laryssa vai fazer', 'atribuir pro João')." },
          suggested_date: { type: "string", description: "Data de vencimento mencionada pelo usuário no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Extraia de expressões como 'entregar sexta', 'dia 28', 'amanhã', 'próxima segunda', etc. Use a data atual fornecida no system prompt como referência para calcular datas relativas." },
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
          creative_instructions: { type: "string", description: "Instruções de arte/criação para o designer ou editor. Para posts de imagem: inclua sugestões de headlines, subtítulos, CTAs e textos de apoio que devem aparecer na arte. Para vídeos/reels: inclua um mini roteiro com os pontos principais, cenas sugeridas e textos em tela. Adapte ao tipo de conteúdo (feed, stories, reels, carrossel, vídeo)." },
          mentioned_clients: { type: "array", items: { type: "string" }, description: "Nomes de clientes ou empresas mencionados pelo usuário no texto. Extraia apenas nomes próprios de pessoas ou empresas que pareçam ser clientes." },
          mentioned_users: { type: "array", items: { type: "string" }, description: "Nomes de pessoas mencionadas como responsáveis ou que devem executar o post. Extraia nomes próprios de pessoas que o usuário indica como executores (ex: 'a Laryssa vai fazer', 'atribuir pro João')." },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioridade do post. Use 'high' se o usuário mencionar urgência, pressa ou prioridade alta. Use 'low' para coisas sem pressa. Default: 'medium'." },
          suggested_date: { type: "string", description: "Data de publicação mencionada pelo usuário no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Extraia de expressões como 'postar na quarta', 'dia 28', 'amanhã', 'próxima segunda', etc. Use a data atual fornecida no system prompt como referência para calcular datas relativas." },
        },
        required: ["title", "description", "platform", "post_type", "hashtags", "creative_instructions"],
        additionalProperties: false,
      },
    },
  },
];

const REPORT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_report_data",
      description: "Gere uma mensagem de relatório de tráfego pago formatada para enviar ao cliente via WhatsApp.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Mensagem completa do relatório, formatada para WhatsApp com emojis e negrito (*texto*). Deve conter resumo dos dados, análise de performance e sugestões de próximo passo." },
        },
        required: ["message"],
        additionalProperties: false,
      },
    },
  },
];

const CAMPAIGN_ANALYSIS_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_campaign_analysis",
      description: "Gere uma análise completa de performance de campanha de tráfego pago baseada nos dados semanais.",
      parameters: {
        type: "object",
        properties: {
          analysis: { type: "string", description: "Análise completa formatada para WhatsApp com emojis e negrito (*texto*). Deve conter: 1) Resumo geral da campanha, 2) Tendências identificadas semana a semana (custo, conversões, CTR, CPC), 3) Pontos de atenção e alertas, 4) Recomendações práticas de otimização." },
        },
        required: ["analysis"],
        additionalProperties: false,
      },
    },
  },
];

const DEFAULT_TASK_PROMPT =
  "Você é um assistente de agência de marketing digital. Extraia os dados estruturados de uma tarefa a partir da descrição do usuário. Gere um título conciso e uma descrição profissional, estruturada e sem erros de gramática.";

const DEFAULT_POST_PROMPT =
  "Você é um social media manager profissional. Extraia os dados de um post para redes sociais a partir da descrição do usuário. Gere uma legenda envolvente, profissional e adaptada para a plataforma sugerida. Inclua hashtags relevantes. Gere também instruções de arte/criação detalhadas para o designer: para posts de imagem inclua headlines, subtítulos, CTAs e textos que devem aparecer na arte; para vídeos/reels inclua um mini roteiro com os pontos principais e textos em tela.";

const DEFAULT_REPORT_PROMPT =
  "Você é um gestor de tráfego pago profissional. Gere uma mensagem direcionada ao cliente com os resultados do período. Inclua um resumo dos dados, uma análise da performance (pontos positivos e o que pode melhorar) e sugestões de próximo passo. Use tom profissional mas acessível, formate para WhatsApp com emojis e negrito (*texto*).";

const DEFAULT_CAMPAIGN_ANALYSIS_PROMPT =
  "Você é um analista sênior de tráfego pago. Analise os dados semanais da campanha e gere um feedback completo. Compare a evolução semana a semana identificando tendências (custo subindo/descendo, conversões melhorando/piorando, CTR e CPC). Destaque pontos de atenção e dê recomendações práticas e acionáveis de otimização. Formate para WhatsApp com emojis e negrito (*texto*) para fácil compartilhamento.";

const TASK_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: Se o usuário mencionar nomes de clientes, empresas ou pessoas que pareçam ser clientes, extraia esses nomes no campo mentioned_clients. Se o usuário mencionar nomes de pessoas como responsáveis ou executores da tarefa (ex: 'a Laryssa vai fazer', 'pro João'), extraia esses nomes no campo mentioned_users. Se o usuário mencionar uma data ou prazo (ex: 'entregar sexta', 'dia 28', 'amanhã', 'próxima segunda'), calcule a data correta usando a data atual como referência e preencha suggested_date no formato ISO 8601. Responda sempre em português brasileiro.";

const POST_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: Se o usuário mencionar nomes de clientes, empresas ou pessoas que pareçam ser clientes, extraia esses nomes no campo mentioned_clients. Se o usuário mencionar nomes de pessoas como responsáveis ou executores do post (ex: 'a Laryssa vai fazer', 'pro João'), extraia esses nomes no campo mentioned_users. Se o usuário mencionar uma data de publicação (ex: 'postar na quarta', 'dia 28', 'amanhã'), calcule a data correta usando a data atual como referência e preencha suggested_date no formato ISO 8601. Se mencionar urgência ou prioridade, preencha o campo priority. Responda em português brasileiro.";

const REPORT_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: A mensagem deve ser direcionada ao cliente (não ao gestor). Use formatação WhatsApp: *negrito* para destaques, emojis para tornar visual. Inclua os números formatados em reais (R$). Responda em português brasileiro. A mensagem deve ser completa e pronta para enviar.";

const CAMPAIGN_ANALYSIS_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: A análise é direcionada ao gestor de tráfego (não ao cliente). Use formatação WhatsApp: *negrito* para destaques, emojis para tornar visual. Compare métricas entre semanas com percentuais de variação quando possível. Identifique padrões e anomalias. Dê recomendações específicas e acionáveis. Responda em português brasileiro.";

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
        
        const promptType = type === "prefill_task" ? "task" : type === "prefill_post" ? "post" : type === "campaign_analysis" ? "campaign_analysis" : "report";
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
      }
    }

    let systemPrompt: string;
    let tools: any[];
    let toolChoice: any;

    const now = new Date();
    const dateContext = ` Data e hora atual: ${now.toISOString()} (${now.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}).`;

    if (type === "prefill_task") {
      const basePrompt = customPrompt || DEFAULT_TASK_PROMPT;
      systemPrompt = basePrompt + TASK_TECHNICAL_INSTRUCTIONS + dateContext;
      tools = TASK_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_task_data" } };
    } else if (type === "prefill_post") {
      const basePrompt = customPrompt || DEFAULT_POST_PROMPT;
      systemPrompt = basePrompt + POST_TECHNICAL_INSTRUCTIONS + dateContext;
      tools = POST_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_post_data" } };
    } else if (type === "report_traffic") {
      const basePrompt = customPrompt || DEFAULT_REPORT_PROMPT;
      systemPrompt = basePrompt + REPORT_TECHNICAL_INSTRUCTIONS;
      tools = REPORT_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_report_data" } };
    } else if (type === "campaign_analysis") {
      const basePrompt = customPrompt || DEFAULT_CAMPAIGN_ANALYSIS_PROMPT;
      systemPrompt = basePrompt + CAMPAIGN_ANALYSIS_TECHNICAL_INSTRUCTIONS;
      tools = CAMPAIGN_ANALYSIS_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_campaign_analysis" } };
    } else {
      return new Response(JSON.stringify({ error: "Tipo inválido. Use prefill_task, prefill_post, report_traffic ou campaign_analysis." }), {
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
