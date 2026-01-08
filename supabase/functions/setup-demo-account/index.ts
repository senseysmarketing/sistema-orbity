import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log("Starting demo account setup...");

    // Demo user credentials
    const demoEmail = "demo@orbityapp.com.br";
    const demoPassword = "Demo@2024!";
    const demoName = "Usuário Demonstração";

    // 1. Create or find demo user
    let userId: string;
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === demoEmail);
    
    if (existingUser) {
      userId = existingUser.id;
      console.log("Demo user already exists:", userId);
    } else {
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { name: demoName, role: "agency_admin" }
      });
      
      if (userError) throw new Error(`Failed to create user: ${userError.message}`);
      userId = newUser.user.id;
      console.log("Created demo user:", userId);
    }

    // 2. Get Senseys plan ID
    const { data: senseysPlan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("slug", "senseys")
      .single();
    
    if (planError || !senseysPlan) {
      throw new Error("Senseys plan not found");
    }
    console.log("Found Senseys plan:", senseysPlan.id);

    // 3. Check if demo agency already exists
    const { data: existingAgency } = await supabase
      .from("agencies")
      .select("id")
      .eq("slug", "demo-orbity")
      .single();

    let agencyId: string;

    if (existingAgency) {
      agencyId = existingAgency.id;
      console.log("Demo agency already exists:", agencyId);
    } else {
      // Create demo agency
      const { data: newAgency, error: agencyError } = await supabase
        .from("agencies")
        .insert({
          name: "Agência Demonstração Orbity",
          slug: "demo-orbity",
          description: "Agência de demonstração com dados fictícios para apresentação do sistema",
          contact_email: demoEmail,
          contact_phone: "(11) 99999-9999",
          is_active: true,
          max_users: 999,
          max_clients: 999,
          max_leads: 999,
          max_tasks: 999,
          subscription_plan: "enterprise"
        })
        .select("id")
        .single();

      if (agencyError) throw new Error(`Failed to create agency: ${agencyError.message}`);
      agencyId = newAgency.id;
      console.log("Created demo agency:", agencyId);
    }

    // 4. Link user to agency
    const { data: existingLink } = await supabase
      .from("agency_users")
      .select("id")
      .eq("user_id", userId)
      .eq("agency_id", agencyId)
      .single();

    if (!existingLink) {
      await supabase.from("agency_users").insert({
        user_id: userId,
        agency_id: agencyId,
        role: "owner"
      });
      console.log("Linked user to agency");
    }

    // 5. Create/update subscription
    const { data: existingSub } = await supabase
      .from("agency_subscriptions")
      .select("id")
      .eq("agency_id", agencyId)
      .single();

    if (existingSub) {
      await supabase
        .from("agency_subscriptions")
        .update({
          plan_id: senseysPlan.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq("id", existingSub.id);
    } else {
      await supabase.from("agency_subscriptions").insert({
        agency_id: agencyId,
        plan_id: senseysPlan.id,
        status: "active",
        billing_cycle: "yearly",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    console.log("Subscription configured");

    // 6. Create lead statuses
    const leadStatuses = [
      { name: "Novo", color: "#6366f1", order_index: 0, is_default: true },
      { name: "Contato", color: "#3b82f6", order_index: 1, is_default: false },
      { name: "Qualificado", color: "#22c55e", order_index: 2, is_default: false },
      { name: "Proposta", color: "#f59e0b", order_index: 3, is_default: false },
      { name: "Negociação", color: "#8b5cf6", order_index: 4, is_default: false },
      { name: "Fechado", color: "#10b981", order_index: 5, is_default: false },
      { name: "Perdido", color: "#ef4444", order_index: 6, is_default: false }
    ];

    for (const status of leadStatuses) {
      const { data: existingStatus } = await supabase
        .from("lead_statuses")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("name", status.name)
        .single();

      if (!existingStatus) {
        await supabase.from("lead_statuses").insert({ ...status, agency_id: agencyId });
      }
    }
    console.log("Lead statuses created");

    // 7. Create task statuses
    const taskStatuses = [
      { name: "A Fazer", color: "#6366f1", order_index: 0, is_default: true },
      { name: "Em Andamento", color: "#3b82f6", order_index: 1, is_default: false },
      { name: "Em Revisão", color: "#f59e0b", order_index: 2, is_default: false },
      { name: "Concluída", color: "#22c55e", order_index: 3, is_default: false }
    ];

    for (const status of taskStatuses) {
      const { data: existingStatus } = await supabase
        .from("task_statuses")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("name", status.name)
        .single();

      if (!existingStatus) {
        await supabase.from("task_statuses").insert({ ...status, agency_id: agencyId });
      }
    }
    console.log("Task statuses created");

    // 8. Create clients
    const clients = [
      { name: "Clínica Bella Vita", service: "Social Media + Tráfego Pago", monthly_value: 3500, contact: "(11) 98765-4321", due_date: 10 },
      { name: "Restaurante Sabor & Arte", service: "Social Media", monthly_value: 2800, contact: "(11) 97654-3210", due_date: 15 },
      { name: "Imobiliária Prime", service: "Tráfego Pago + Landing Pages", monthly_value: 4200, contact: "(11) 96543-2109", due_date: 5 },
      { name: "Academia FitLife", service: "Social Media + Conteúdo", monthly_value: 2500, contact: "(11) 95432-1098", due_date: 20 },
      { name: "TechStore Brasil", service: "E-commerce + Performance", monthly_value: 5000, contact: "(11) 94321-0987", due_date: 1 },
      { name: "Advocacia Silva & Associados", service: "Branding + Website", monthly_value: 3800, contact: "(11) 93210-9876", due_date: 10 },
      { name: "Pet Shop Patinhas", service: "Social Media", monthly_value: 1800, contact: "(11) 92109-8765", due_date: 25 },
      { name: "Escola Fluent Idiomas", service: "Captação de Leads", monthly_value: 3200, contact: "(11) 91098-7654", due_date: 15 },
      { name: "Ótica Visão Perfeita", service: "Social Media + Tráfego", monthly_value: 2200, contact: "(11) 90987-6543", due_date: 5 },
      { name: "Construtora Horizonte", service: "Tráfego Pago Premium", monthly_value: 6500, contact: "(11) 89876-5432", due_date: 1 },
      { name: "Clínica Odonto Smile", service: "Social Media + Google Ads", monthly_value: 4000, contact: "(11) 88765-4321", due_date: 10 },
      { name: "Consultoria RH Plus", service: "LinkedIn + Conteúdo B2B", monthly_value: 3000, contact: "(11) 87654-3210", due_date: 20 }
    ];

    const clientIds: string[] = [];
    for (const client of clients) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("name", client.name)
        .single();

      if (existingClient) {
        clientIds.push(existingClient.id);
      } else {
        const startDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
        const { data: newClient } = await supabase
          .from("clients")
          .insert({
            ...client,
            agency_id: agencyId,
            active: true,
            has_loyalty: Math.random() > 0.3,
            start_date: startDate.toISOString().split('T')[0],
            contract_start_date: startDate.toISOString().split('T')[0]
          })
          .select("id")
          .single();
        
        if (newClient) clientIds.push(newClient.id);
      }
    }
    console.log(`Created/found ${clientIds.length} clients`);

    // 9. Create leads
    const { data: leadStatusesData } = await supabase
      .from("lead_statuses")
      .select("id, name")
      .eq("agency_id", agencyId);

    const statusMap = new Map(leadStatusesData?.map(s => [s.name, s.id]) || []);

    const leads = [
      { name: "Maria Santos", email: "maria.santos@email.com", phone: "(11) 99999-1111", company: "Clínica Estética Renova", status: "Novo", priority: "high", value: 4500, source: "facebook_ads" },
      { name: "João Oliveira", email: "joao.oliveira@email.com", phone: "(11) 99999-2222", company: "Restaurante Casa Nova", status: "Novo", priority: "medium", value: 2500, source: "instagram" },
      { name: "Ana Costa", email: "ana.costa@email.com", phone: "(11) 99999-3333", company: "Imob Premium", status: "Contato", priority: "high", value: 6000, source: "google_ads" },
      { name: "Pedro Lima", email: "pedro.lima@email.com", phone: "(11) 99999-4444", company: "Academia Power", status: "Contato", priority: "medium", value: 3000, source: "indicacao" },
      { name: "Carla Mendes", email: "carla.mendes@email.com", phone: "(11) 99999-5555", company: "Loja Fashion Store", status: "Qualificado", priority: "high", value: 5500, source: "facebook_ads" },
      { name: "Lucas Ferreira", email: "lucas.ferreira@email.com", phone: "(11) 99999-6666", company: "Escritório Contábil LF", status: "Qualificado", priority: "medium", value: 3500, source: "site" },
      { name: "Juliana Rocha", email: "juliana.rocha@email.com", phone: "(11) 99999-7777", company: "Salão Beauty Hair", status: "Proposta", priority: "high", value: 2800, source: "instagram" },
      { name: "Rafael Souza", email: "rafael.souza@email.com", phone: "(11) 99999-8888", company: "Oficina Auto Tech", status: "Proposta", priority: "medium", value: 2200, source: "whatsapp" },
      { name: "Fernanda Alves", email: "fernanda.alves@email.com", phone: "(11) 99999-9999", company: "Clínica Veterinária Pets", status: "Negociação", priority: "high", value: 4000, source: "facebook_ads" },
      { name: "Bruno Martins", email: "bruno.martins@email.com", phone: "(11) 88888-1111", company: "Construtora BM", status: "Negociação", priority: "high", value: 8000, source: "indicacao" },
      { name: "Patrícia Dias", email: "patricia.dias@email.com", phone: "(11) 88888-2222", company: "Escola de Música", status: "Novo", priority: "low", value: 1500, source: "site" },
      { name: "Ricardo Nunes", email: "ricardo.nunes@email.com", phone: "(11) 88888-3333", company: "Lanchonete Fast Burguer", status: "Novo", priority: "medium", value: 1800, source: "instagram" },
      { name: "Camila Ribeiro", email: "camila.ribeiro@email.com", phone: "(11) 88888-4444", company: "Clínica Derma Skin", status: "Contato", priority: "high", value: 5000, source: "google_ads" },
      { name: "Thiago Cardoso", email: "thiago.cardoso@email.com", phone: "(11) 88888-5555", company: "Academia CrossFit Elite", status: "Contato", priority: "medium", value: 3200, source: "facebook_ads" },
      { name: "Amanda Gomes", email: "amanda.gomes@email.com", phone: "(11) 88888-6666", company: "Boutique Moda Chic", status: "Qualificado", priority: "medium", value: 2800, source: "instagram" },
      { name: "Felipe Araújo", email: "felipe.araujo@email.com", phone: "(11) 88888-7777", company: "Escritório Advocacia FA", status: "Proposta", priority: "high", value: 4500, source: "indicacao" },
      { name: "Vanessa Castro", email: "vanessa.castro@email.com", phone: "(11) 88888-8888", company: "Papelaria Criativa", status: "Perdido", priority: "low", value: 1200, source: "site" },
      { name: "Marcos Paulo", email: "marcos.paulo@email.com", phone: "(11) 88888-9999", company: "Barbearia Style Men", status: "Perdido", priority: "medium", value: 1800, source: "instagram" },
      { name: "Renata Vieira", email: "renata.vieira@email.com", phone: "(11) 77777-1111", company: "Floricultura Jardim", status: "Novo", priority: "low", value: 1500, source: "whatsapp" },
      { name: "Gustavo Henrique", email: "gustavo.h@email.com", phone: "(11) 77777-2222", company: "Tech Solutions LTDA", status: "Contato", priority: "high", value: 7500, source: "linkedin" },
      { name: "Isabela Franco", email: "isabela.franco@email.com", phone: "(11) 77777-3333", company: "Clínica Fisioterapia", status: "Qualificado", priority: "high", value: 3800, source: "google_ads" },
      { name: "Diego Moreira", email: "diego.moreira@email.com", phone: "(11) 77777-4444", company: "Pizzaria Bella Napoli", status: "Proposta", priority: "medium", value: 2500, source: "facebook_ads" },
      { name: "Larissa Campos", email: "larissa.campos@email.com", phone: "(11) 77777-5555", company: "Studio de Pilates", status: "Novo", priority: "medium", value: 2200, source: "instagram" },
      { name: "Eduardo Ramos", email: "eduardo.ramos@email.com", phone: "(11) 77777-6666", company: "Auto Escola Dirigir Bem", status: "Perdido", priority: "low", value: 1600, source: "site" },
      { name: "Natália Lopes", email: "natalia.lopes@email.com", phone: "(11) 77777-7777", company: "Clínica Psicologia Mente Sã", status: "Fechado", priority: "high", value: 3000, source: "indicacao" }
    ];

    for (const lead of leads) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("email", lead.email)
        .single();

      if (!existingLead) {
        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        await supabase.from("leads").insert({
          ...lead,
          agency_id: agencyId,
          created_by: userId,
          status: statusMap.get(lead.status) ? lead.status : "Novo",
          created_at: createdAt.toISOString(),
          next_contact: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }
    console.log("Leads created");

    // 10. Create tasks
    const { data: taskStatusesData } = await supabase
      .from("task_statuses")
      .select("id, name")
      .eq("agency_id", agencyId);

    const taskStatusMap = new Map(taskStatusesData?.map(s => [s.name, s.id]) || []);

    const tasks = [
      { title: "Criar campanha de Verão - Clínica Bella Vita", description: "Desenvolver criativos e copy para campanha de verão focada em procedimentos estéticos", status: "A Fazer", priority: "high" },
      { title: "Redesign do logo - TechStore Brasil", description: "Atualizar identidade visual da marca com conceito mais moderno", status: "Em Andamento", priority: "high" },
      { title: "Relatório mensal - Academia FitLife", description: "Compilar métricas de performance e ROI do mês", status: "Concluída", priority: "medium" },
      { title: "Landing page nova - Imobiliária Prime", description: "Criar LP para captação de leads de imóveis de alto padrão", status: "Em Revisão", priority: "high" },
      { title: "Posts semanais - Pet Shop Patinhas", description: "Criar 5 posts para a semana com foco em promoções", status: "A Fazer", priority: "medium" },
      { title: "Configurar pixel - Construtora Horizonte", description: "Instalar e configurar pixel do Facebook no site", status: "Concluída", priority: "high" },
      { title: "Vídeo institucional - Advocacia Silva", description: "Roteiro e gravação de vídeo de apresentação", status: "Em Andamento", priority: "medium" },
      { title: "E-mail marketing - Escola Fluent", description: "Criar sequência de nurturing para leads de inglês", status: "A Fazer", priority: "low" },
      { title: "Otimização de campanhas - Odonto Smile", description: "Revisar e otimizar campanhas do Google Ads", status: "Em Andamento", priority: "high" },
      { title: "Criação de reels - Restaurante Sabor & Arte", description: "Produzir 10 reels com receitas e bastidores", status: "Em Revisão", priority: "medium" },
      { title: "Briefing novo cliente - Consultoria RH Plus", description: "Reunir informações e definir estratégia inicial", status: "Concluída", priority: "high" },
      { title: "Análise de concorrência - TechStore", description: "Mapear estratégias dos principais concorrentes", status: "A Fazer", priority: "medium" },
      { title: "Stories diários - Clínica Bella Vita", description: "Criar template e cronograma de stories", status: "Concluída", priority: "low" },
      { title: "Campanha de Natal - Ótica Visão Perfeita", description: "Planejar e executar campanha promocional de Natal", status: "A Fazer", priority: "high" },
      { title: "Integração CRM - Imobiliária Prime", description: "Conectar leads do Facebook ao CRM do cliente", status: "Em Andamento", priority: "high" },
      { title: "Fotos de produtos - Pet Shop Patinhas", description: "Organizar sessão de fotos dos produtos principais", status: "A Fazer", priority: "medium" },
      { title: "Blog posts - Advocacia Silva", description: "Escrever 4 artigos sobre direito empresarial", status: "Em Revisão", priority: "low" },
      { title: "Remarketing - Academia FitLife", description: "Configurar públicos de remarketing no Facebook", status: "Concluída", priority: "medium" },
      { title: "Calendário editorial - Escola Fluent", description: "Planejar conteúdo dos próximos 3 meses", status: "Em Andamento", priority: "medium" },
      { title: "A/B test de criativos - Odonto Smile", description: "Testar diferentes abordagens visuais nos anúncios", status: "A Fazer", priority: "high" },
      { title: "Revisão de métricas - Construtora Horizonte", description: "Analisar performance do último trimestre", status: "Concluída", priority: "medium" },
      { title: "Produção de conteúdo - Consultoria RH Plus", description: "Criar posts sobre recrutamento e seleção", status: "A Fazer", priority: "low" },
      { title: "Configurar Google Analytics 4 - TechStore", description: "Migrar e configurar GA4 no e-commerce", status: "Em Andamento", priority: "high" },
      { title: "Campanha de leads - Clínica Bella Vita", description: "Criar campanha focada em agendamentos", status: "Em Revisão", priority: "high" },
      { title: "Gestão de comentários - Restaurante Sabor & Arte", description: "Responder avaliações e interagir com seguidores", status: "Concluída", priority: "low" },
      { title: "Planejamento Q1 2025 - Todos os clientes", description: "Definir metas e estratégias para o primeiro trimestre", status: "A Fazer", priority: "high" },
      { title: "Workshop interno - Equipe", description: "Preparar apresentação sobre novas tendências de marketing", status: "A Fazer", priority: "medium" },
      { title: "Atualizar portfólio - Agência", description: "Adicionar cases recentes ao site da agência", status: "Em Andamento", priority: "low" },
      { title: "Proposta comercial - Novo prospect", description: "Elaborar proposta para potencial cliente de e-commerce", status: "A Fazer", priority: "high" },
      { title: "Treinamento do cliente - Imobiliária Prime", description: "Ensinar equipe do cliente a usar o dashboard", status: "Concluída", priority: "medium" }
    ];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const clientId = clientIds[i % clientIds.length];
      
      const { data: existingTask } = await supabase
        .from("tasks")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("title", task.title)
        .single();

      if (!existingTask) {
        const dueDate = new Date(Date.now() + (Math.random() * 14 - 7) * 24 * 60 * 60 * 1000);
        await supabase.from("tasks").insert({
          ...task,
          agency_id: agencyId,
          client_id: clientId,
          created_by: userId,
          due_date: dueDate.toISOString().split('T')[0]
        });
      }
    }
    console.log("Tasks created");

    // 11. Create social media posts
    const platforms = ["instagram", "facebook", "linkedin", "tiktok"];
    const postStatuses = ["rascunho", "aprovacao", "agendado", "publicado"];
    const contentTypes = ["feed", "stories", "reels", "carousel"];

    const posts = [
      { title: "Promoção de Verão - Bella Vita", content: "Aproveite nossos tratamentos com até 30% OFF! ☀️", platform: "instagram", status: "publicado", content_type: "feed" },
      { title: "Novo cardápio - Sabor & Arte", content: "Conheça nossos novos pratos da temporada 🍽️", platform: "instagram", status: "agendado", content_type: "carousel" },
      { title: "Imóvel em destaque - Prime", content: "Apartamento 3 quartos em localização privilegiada 🏠", platform: "facebook", status: "publicado", content_type: "feed" },
      { title: "Dicas de treino - FitLife", content: "5 exercícios para fazer em casa 💪", platform: "instagram", status: "aprovacao", content_type: "reels" },
      { title: "Lançamento produto - TechStore", content: "Chegou o novo smartphone! Confira as especificações 📱", platform: "instagram", status: "rascunho", content_type: "feed" },
      { title: "Artigo jurídico - Silva & Associados", content: "Entenda seus direitos trabalhistas", platform: "linkedin", status: "publicado", content_type: "feed" },
      { title: "Pets da semana - Patinhas", content: "Conheça os fofinhos disponíveis para adoção 🐕", platform: "instagram", status: "agendado", content_type: "carousel" },
      { title: "Curso de inglês - Fluent", content: "Matrículas abertas com condições especiais! 📚", platform: "facebook", status: "aprovacao", content_type: "feed" },
      { title: "Óculos tendência - Visão Perfeita", content: "As armações que são sucesso nesta temporada 👓", platform: "instagram", status: "publicado", content_type: "stories" },
      { title: "Novo empreendimento - Horizonte", content: "Conheça o residencial Vista Mar 🌊", platform: "facebook", status: "agendado", content_type: "feed" },
      { title: "Sorriso perfeito - Odonto Smile", content: "Clareamento dental com resultados incríveis ✨", platform: "instagram", status: "rascunho", content_type: "reels" },
      { title: "Vagas abertas - RH Plus", content: "Oportunidades para profissionais de TI", platform: "linkedin", status: "publicado", content_type: "feed" },
      { title: "Bastidores - Bella Vita", content: "Um dia na clínica com nossa equipe 👩‍⚕️", platform: "instagram", status: "aprovacao", content_type: "stories" },
      { title: "Receita especial - Sabor & Arte", content: "Aprenda a fazer nosso risoto premiado 🍚", platform: "instagram", status: "agendado", content_type: "reels" },
      { title: "Depoimento cliente - FitLife", content: "Transformação incrível em 6 meses 🏋️", platform: "instagram", status: "publicado", content_type: "feed" }
    ];

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const clientId = clientIds[i % clientIds.length];

      const { data: existingPost } = await supabase
        .from("social_media_posts")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("title", post.title)
        .single();

      if (!existingPost) {
        const scheduledDate = new Date(Date.now() + (Math.random() * 14 - 7) * 24 * 60 * 60 * 1000);
        await supabase.from("social_media_posts").insert({
          ...post,
          agency_id: agencyId,
          client_id: clientId,
          created_by: userId,
          scheduled_date: scheduledDate.toISOString()
        });
      }
    }
    console.log("Social media posts created");

    // 12. Create meetings
    const meetings = [
      { title: "Onboarding - Novo cliente", type: "onboarding", status: "scheduled", duration_minutes: 60 },
      { title: "Apresentação de resultados - Bella Vita", type: "results", status: "scheduled", duration_minutes: 45 },
      { title: "Alinhamento estratégico - TechStore", type: "alignment", status: "scheduled", duration_minutes: 30 },
      { title: "Reunião comercial - Prospect Academia", type: "commercial", status: "scheduled", duration_minutes: 45 },
      { title: "Briefing de campanha - Imobiliária Prime", type: "briefing", status: "scheduled", duration_minutes: 60 },
      { title: "Follow-up mensal - Restaurante", type: "follow_up", status: "scheduled", duration_minutes: 30 },
      { title: "Revisão de contrato - Advocacia Silva", type: "client", status: "completed", duration_minutes: 45 },
      { title: "Apresentação de proposta - Pet Shop", type: "commercial", status: "completed", duration_minutes: 60 },
      { title: "Kickoff de projeto - Escola Fluent", type: "onboarding", status: "completed", duration_minutes: 90 },
      { title: "Análise de métricas - Ótica", type: "results", status: "completed", duration_minutes: 30 },
      { title: "Planejamento trimestral - Construtora", type: "alignment", status: "completed", duration_minutes: 60 },
      { title: "Treinamento de plataforma - Odonto", type: "training", status: "completed", duration_minutes: 45 }
    ];

    for (let i = 0; i < meetings.length; i++) {
      const meeting = meetings[i];
      const clientId = clientIds[i % clientIds.length];

      const { data: existingMeeting } = await supabase
        .from("meetings")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("title", meeting.title)
        .single();

      if (!existingMeeting) {
        const isCompleted = meeting.status === "completed";
        const startTime = isCompleted 
          ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000);
        
        startTime.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
        
        const endTime = new Date(startTime.getTime() + meeting.duration_minutes * 60 * 1000);

        await supabase.from("meetings").insert({
          title: meeting.title,
          agency_id: agencyId,
          client_id: clientId,
          created_by: userId,
          meeting_type: meeting.type as any,
          status: meeting.status as any,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: Math.random() > 0.5 ? "Google Meet" : "Presencial - Escritório"
        });
      }
    }
    console.log("Meetings created");

    // 13. Create reminders
    const reminders = [
      { title: "Renovar contrato - Bella Vita", description: "Contrato vence em 30 dias", priority: "high" },
      { title: "Follow-up lead quente", description: "Entrar em contato com Maria Santos", priority: "high" },
      { title: "Revisar métricas semanais", description: "Compilar dados de performance", priority: "medium" },
      { title: "Enviar relatório mensal", description: "Relatório para todos os clientes", priority: "medium" },
      { title: "Atualizar portfólio", description: "Adicionar novos cases ao site", priority: "low" }
    ];

    // First check if reminder_lists table exists and create a default list
    const { data: existingList } = await supabase
      .from("reminder_lists")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("name", "Geral")
      .single();

    let listId: string;
    if (existingList) {
      listId = existingList.id;
    } else {
      const { data: newList } = await supabase
        .from("reminder_lists")
        .insert({
          agency_id: agencyId,
          name: "Geral",
          color: "#6366f1",
          created_by: userId
        })
        .select("id")
        .single();
      listId = newList?.id;
    }

    if (listId) {
      for (const reminder of reminders) {
        const { data: existingReminder } = await supabase
          .from("reminders")
          .select("id")
          .eq("agency_id", agencyId)
          .eq("title", reminder.title)
          .single();

        if (!existingReminder) {
          const dueDate = new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000);
          await supabase.from("reminders").insert({
            ...reminder,
            agency_id: agencyId,
            list_id: listId,
            created_by: userId,
            due_date: dueDate.toISOString(),
            completed: false
          });
        }
      }
      console.log("Reminders created");
    }

    console.log("Demo account setup completed successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conta de demonstração criada com sucesso!",
        credentials: {
          email: demoEmail,
          password: demoPassword,
          agencyName: "Agência Demonstração Orbity"
        },
        data: {
          clients: clientIds.length,
          leads: leads.length,
          tasks: tasks.length,
          posts: posts.length,
          meetings: meetings.length,
          reminders: reminders.length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error setting up demo account:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
