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
          suggested_type: { type: "string", description: "Sugestão de tipo baseado no contexto. Se o usuário descrever conteúdo para redes sociais (post, reels, stories, carrossel, etc.), use 'redes_sociais'. Se descrever arte, banner, criativo, material visual, campanha publicitária, peça gráfica, use 'criativos'. Outros exemplos: conteudo, desenvolvimento, suporte, administrativo, reuniao." },
          mentioned_clients: { type: "array", items: { type: "string" }, description: "Nomes de clientes ou empresas mencionados pelo usuário no texto. Extraia apenas nomes próprios de pessoas ou empresas que pareçam ser clientes." },
          mentioned_users: { type: "array", items: { type: "string" }, description: "Nomes de pessoas mencionadas como responsáveis ou que devem executar a tarefa. Extraia nomes próprios de pessoas que o usuário indica como executores (ex: 'a Laryssa vai fazer', 'atribuir pro João')." },
          suggested_date: { type: "string", description: "Data de vencimento mencionada pelo usuário no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Extraia de expressões como 'entregar sexta', 'dia 28', 'amanhã', 'próxima segunda', etc. Use a data atual fornecida no system prompt como referência para calcular datas relativas." },
          platform: { type: "string", enum: ["instagram", "facebook", "linkedin", "twitter", "tiktok", "youtube"], description: "Plataforma de rede social, se aplicável. Preencher apenas quando suggested_type for 'redes_sociais'." },
          post_type: { type: "string", enum: ["feed", "stories", "reels", "carrossel", "video"], description: "Tipo de conteúdo para rede social. Preencher apenas quando suggested_type for 'redes_sociais'." },
          hashtags: { type: "array", items: { type: "string" }, description: "Hashtags relevantes para o conteúdo de redes sociais. Preencher apenas quando suggested_type for 'redes_sociais'." },
          creative_instructions: { type: "string", description: "Instruções de arte/criação para o designer. Para posts de imagem: headlines, subtítulos, CTAs. Para vídeos/reels: mini roteiro. Para criativos de campanhas: briefing visual, formatos, textos na arte. Preencher quando suggested_type for 'redes_sociais' ou 'criativos'." },
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

const ANALYTICS_REVIEW_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_analytics_review",
      description: "Gere uma análise completa de produtividade da equipe baseada nos dados agregados do período.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Resumo executivo do período em 2-3 frases, destacando os números mais importantes." },
          workload_analysis: { type: "string", description: "Análise da distribuição de carga entre os membros da equipe. Identifique quem está sobrecarregado e quem pode receber mais tarefas." },
          bottlenecks: { type: "string", description: "Gargalos identificados: revisões paradas, tarefas sem dono, atrasos recorrentes." },
          client_alerts: { type: "string", description: "Clientes que precisam de atenção prioritária baseado em taxas de conclusão baixas ou muitos atrasos." },
          suggestions: { type: "array", items: { type: "string" }, description: "Lista de 3-5 sugestões práticas e acionáveis de melhoria para o gestor." },
          performance_score: { type: "number", description: "Nota de performance geral da equipe de 1 a 10, baseada na taxa de conclusão, atrasos e distribuição." },
          performance_label: { type: "string", description: "Label da nota: 'Crítico' (1-3), 'Precisa Melhorar' (4-5), 'Bom' (6-7), 'Muito Bom' (8-9), 'Excelente' (10)." },
        },
        required: ["summary", "workload_analysis", "bottlenecks", "client_alerts", "suggestions", "performance_score", "performance_label"],
        additionalProperties: false,
      },
    },
  },
];

const CONTENT_PLANNING_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_content_plan",
      description: "Gere um planejamento completo de conteúdo para redes sociais baseado no contexto do cliente.",
      parameters: {
        type: "object",
        properties: {
          plan_title: { type: "string", description: "Título do planejamento, ex: 'Planejamento Março 2026 - Nome do Cliente'" },
          strategy_summary: { type: "string", description: "Resumo da estratégia adotada para o período, explicando as escolhas de conteúdo." },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day_number: { type: "number", description: "Número sequencial do conteúdo (1, 2, 3...)" },
                post_date: { type: "string", description: "Data de publicação no formato YYYY-MM-DD" },
                title: { type: "string", description: "Título interno do conteúdo" },
                description: { type: "string", description: "Legenda/caption ou descrição do conteúdo" },
                content_type: { type: "string", description: "Tipo: educativo, informativo, autoridade, prova_social, bastidores, conversao, trend, objecoes, storytelling, tutorial" },
                format: { type: "string", description: "Formato: carrossel, feed, reels, stories" },
                platform: { type: "string", description: "Plataforma: instagram, facebook, linkedin, tiktok, youtube" },
                creative_instructions: { type: "string", description: "Instruções detalhadas para o designer/editor: headlines, CTAs, roteiro, textos na arte" },
                objective: { type: "string", description: "Objetivo específico deste conteúdo (ex: 'gerar autoridade', 'converter para vendas')" },
                hashtags: { type: "string", description: "Hashtags relevantes separadas por vírgula" },
              },
              required: ["day_number", "post_date", "title", "description", "content_type", "format", "platform", "objective"],
              additionalProperties: false,
            },
          },
        },
        required: ["plan_title", "strategy_summary", "items"],
        additionalProperties: false,
      },
    },
  },
];

const DEFAULT_TASK_PROMPT =
  "Você é um assistente de agência de marketing digital. Extraia os dados estruturados de uma tarefa a partir da descrição do usuário. Gere um título conciso e uma descrição profissional, estruturada e sem erros de gramática. Se o usuário descrever conteúdo para redes sociais (ex: 'criar um post no Instagram', 'publicar um reels sobre...', 'fazer um carrossel', 'stories para o cliente X'), defina suggested_type como 'redes_sociais' e preencha os campos platform, post_type, hashtags e creative_instructions. Se o usuário descrever arte, banner, criativo, material visual, campanha publicitária, peça gráfica ou qualquer demanda para designer (ex: 'criar um banner', 'arte para campanha', 'criativo para anúncio'), defina suggested_type como 'criativos' e preencha creative_instructions com orientações visuais detalhadas.";

const DEFAULT_POST_PROMPT =
  "Você é um social media manager profissional. Extraia os dados de um post para redes sociais a partir da descrição do usuário. Gere uma legenda envolvente, profissional e adaptada para a plataforma sugerida. Inclua hashtags relevantes. Gere também instruções de arte/criação detalhadas para o designer: para posts de imagem inclua headlines, subtítulos, CTAs e textos que devem aparecer na arte; para vídeos/reels inclua um mini roteiro com os pontos principais e textos em tela.";

const DEFAULT_REPORT_PROMPT =
  "Você é um gestor de tráfego pago profissional. Gere uma mensagem direcionada ao cliente com os resultados do período. Inclua um resumo dos dados, uma análise da performance (pontos positivos e o que pode melhorar) e sugestões de próximo passo. Use tom profissional mas acessível, formate para WhatsApp com emojis e negrito (*texto*).";

const DEFAULT_CAMPAIGN_ANALYSIS_PROMPT =
  "Você é um analista sênior de tráfego pago. Analise os dados semanais da campanha e gere um feedback completo. Compare a evolução semana a semana identificando tendências (custo subindo/descendo, conversões melhorando/piorando, CTR e CPC). Destaque pontos de atenção e dê recomendações práticas e acionáveis de otimização. Formate para WhatsApp com emojis e negrito (*texto*) para fácil compartilhamento.";

const DEFAULT_ANALYTICS_REVIEW_PROMPT =
  "Você é um analista de produtividade de agências de marketing digital. Analise os dados de tarefas do período e gere um feedback completo para o gestor. Seja direto, prático e baseado nos números. Identifique padrões, gargalos e oportunidades de melhoria. Considere a distribuição de carga entre membros, taxas de conclusão por cliente e por tipo de tarefa, e sugira ações concretas.";

const TASK_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: Se o usuário mencionar nomes de clientes, empresas ou pessoas que pareçam ser clientes, extraia esses nomes no campo mentioned_clients. Se o usuário mencionar nomes de pessoas como responsáveis ou executores da tarefa (ex: 'a Laryssa vai fazer', 'pro João'), extraia esses nomes no campo mentioned_users. Se o usuário mencionar uma data ou prazo (ex: 'entregar sexta', 'dia 28', 'amanhã', 'próxima segunda'), calcule a data correta usando a data atual como referência e preencha suggested_date no formato ISO 8601. Responda sempre em português brasileiro.";

const POST_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: Se o usuário mencionar nomes de clientes, empresas ou pessoas que pareçam ser clientes, extraia esses nomes no campo mentioned_clients. Se o usuário mencionar nomes de pessoas como responsáveis ou executores do post (ex: 'a Laryssa vai fazer', 'pro João'), extraia esses nomes no campo mentioned_users. Se o usuário mencionar uma data de publicação (ex: 'postar na quarta', 'dia 28', 'amanhã'), calcule a data correta usando a data atual como referência e preencha suggested_date no formato ISO 8601. Se mencionar urgência ou prioridade, preencha o campo priority. Responda em português brasileiro.";

const REPORT_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: A mensagem deve ser direcionada ao cliente (não ao gestor). Use formatação WhatsApp: *negrito* para destaques, emojis para tornar visual. Inclua os números formatados em reais (R$). Responda em português brasileiro. A mensagem deve ser completa e pronta para enviar.";

const CAMPAIGN_ANALYSIS_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: A análise é direcionada ao gestor de tráfego (não ao cliente). Use formatação WhatsApp: *negrito* para destaques, emojis para tornar visual. Compare métricas entre semanas com percentuais de variação quando possível. Identifique padrões e anomalias. Dê recomendações específicas e acionáveis. Responda em português brasileiro.";

const ANALYTICS_REVIEW_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: A análise é direcionada ao gestor da agência. Seja objetivo e prático. Use dados concretos (nomes, números, percentuais). As sugestões devem ser acionáveis e específicas. A nota de performance deve refletir: taxa de conclusão (peso maior), atrasos, distribuição equilibrada e tarefas sem dono. Responda em português brasileiro.";

const DEFAULT_CONTENT_PLANNING_PROMPT =
  "Você é um estrategista de conteúdo para redes sociais de uma agência de marketing digital. Gere um planejamento mensal de conteúdo completo e estratégico baseado no contexto do cliente, nicho, objetivos e frequência solicitada. Distribua os conteúdos de forma equilibrada entre tipos (educativo, autoridade, conversão, prova social, bastidores, storytelling) e formatos (carrossel, feed, reels, stories). Cada conteúdo deve ter título, legenda, instruções criativas detalhadas e hashtags relevantes.";

const CONTENT_PLANNING_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: Gere exatamente a quantidade de conteúdos correspondente à frequência semanal multiplicada pelas semanas do período. Distribua as datas de forma equilibrada ao longo do mês, evitando fins de semana quando possível. Cada item deve ter post_date no formato YYYY-MM-DD. As instruções criativas (creative_instructions) devem ser detalhadas o suficiente para um designer executar sem dúvidas. Responda em português brasileiro.";

const DEFAULT_IMPROVE_TASK_PROMPT =
  "Você é um assistente especialista em gestão de projetos de agências de marketing digital. O usuário já criou uma tarefa com algumas informações básicas. Seu trabalho é MELHORAR e DESENVOLVER essas informações, mantendo o sentido original. Corrija erros de gramática, expanda a descrição com mais detalhes úteis, melhore as instruções criativas tornando-as mais claras e acionáveis, e sugira hashtags mais relevantes se aplicável. NÃO mude o propósito da tarefa, apenas aprimore a qualidade do conteúdo.";

const IMPROVE_TASK_TECHNICAL_INSTRUCTIONS =
  " IMPORTANTE: Mantenha o sentido original de todos os campos. Se um campo estiver vazio, você pode sugerir conteúdo baseado nos outros campos preenchidos. A descrição deve ser profissional, estruturada e detalhada. Se houver creative_instructions, torne-as mais claras com orientações específicas para o designer. Se houver hashtags, melhore-as mantendo relevância. Responda em português brasileiro.";

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
        
        const promptType = type === "prefill_task" ? "task" : type === "prefill_post" ? "post" : type === "campaign_analysis" ? "campaign_analysis" : type === "analytics_review" ? "analytics" : type === "content_planning" ? "content_planning" : "report";
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
    } else if (type === "analytics_review") {
      const basePrompt = customPrompt || DEFAULT_ANALYTICS_REVIEW_PROMPT;
      systemPrompt = basePrompt + ANALYTICS_REVIEW_TECHNICAL_INSTRUCTIONS;
      tools = ANALYTICS_REVIEW_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_analytics_review" } };
    } else if (type === "content_planning") {
      const basePrompt = customPrompt || DEFAULT_CONTENT_PLANNING_PROMPT;
      systemPrompt = basePrompt + CONTENT_PLANNING_TECHNICAL_INSTRUCTIONS + dateContext;
      tools = CONTENT_PLANNING_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_content_plan" } };
    } else if (type === "improve_task") {
      systemPrompt = DEFAULT_IMPROVE_TASK_PROMPT + IMPROVE_TASK_TECHNICAL_INSTRUCTIONS + dateContext;
      tools = TASK_TOOLS;
      toolChoice = { type: "function", function: { name: "extract_task_data" } };
    } else {
      return new Response(JSON.stringify({ error: "Tipo inválido." }), {
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
