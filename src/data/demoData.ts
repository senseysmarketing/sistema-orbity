// Dados fictícios para a demonstração interativa da Landing Page

export const demoClients = [
  {
    id: "1",
    name: "Clínica Estética Bella Vita",
    service: "Marketing Digital Completo",
    monthly_value: 4500,
    active: true,
    contact: "(11) 99999-1234",
    start_date: "2024-03-15",
  },
  {
    id: "2",
    name: "Restaurante Sabor & Arte",
    service: "Social Media + Tráfego Pago",
    monthly_value: 3200,
    active: true,
    contact: "(11) 98888-5678",
    start_date: "2024-01-10",
  },
  {
    id: "3",
    name: "Imobiliária Prime",
    service: "Google Ads + Landing Pages",
    monthly_value: 6800,
    active: true,
    contact: "(11) 97777-9012",
    start_date: "2023-11-20",
  },
  {
    id: "4",
    name: "Academia FitLife",
    service: "Instagram + Facebook Ads",
    monthly_value: 2800,
    active: true,
    contact: "(11) 96666-3456",
    start_date: "2024-02-01",
  },
  {
    id: "5",
    name: "E-commerce TechStore",
    service: "Performance Marketing",
    monthly_value: 8500,
    active: true,
    contact: "(11) 95555-7890",
    start_date: "2023-09-05",
  },
  {
    id: "6",
    name: "Escritório Silva & Associados",
    service: "Branding + LinkedIn",
    monthly_value: 3500,
    active: true,
    contact: "(11) 94444-2345",
    start_date: "2024-04-01",
  },
  {
    id: "7",
    name: "Pet Shop Patinhas",
    service: "Social Media",
    monthly_value: 1800,
    active: true,
    contact: "(11) 93333-6789",
    start_date: "2024-05-15",
  },
  {
    id: "8",
    name: "Escola Fluent Idiomas",
    service: "Marketing Digital Completo",
    monthly_value: 5200,
    active: false,
    contact: "(11) 92222-0123",
    start_date: "2023-06-01",
  },
];

export const demoLeads = [
  { id: "1", name: "Carlos Mendes", company: "Auto Center Premium", status: "novo", priority: "alta", source: "Facebook Ads", value: 4500 },
  { id: "2", name: "Ana Paula Silva", company: "Boutique Elegance", status: "novo", priority: "média", source: "Instagram", value: 2800 },
  { id: "3", name: "Roberto Campos", company: "Construtora Horizonte", status: "contato", priority: "alta", source: "Google", value: 12000 },
  { id: "4", name: "Fernanda Costa", company: "Clínica OdontoSmile", status: "contato", priority: "alta", source: "Indicação", value: 5500 },
  { id: "5", name: "Lucas Pereira", company: "Restaurante La Pasta", status: "qualificado", priority: "média", source: "Facebook Ads", value: 3200 },
  { id: "6", name: "Mariana Santos", company: "Studio de Pilates", status: "qualificado", priority: "baixa", source: "Instagram", value: 1800 },
  { id: "7", name: "Pedro Almeida", company: "Loja de Móveis Casa Nova", status: "proposta", priority: "alta", source: "Google", value: 7500 },
  { id: "8", name: "Juliana Ferreira", company: "Salão Beauty Hair", status: "proposta", priority: "média", source: "Indicação", value: 2500 },
  { id: "9", name: "André Oliveira", company: "Oficina Auto Tech", status: "cliente", priority: "alta", source: "Facebook Ads", value: 3800 },
  { id: "10", name: "Camila Rocha", company: "Escola de Dança Move", status: "cliente", priority: "média", source: "Instagram", value: 2200 },
  { id: "11", name: "Thiago Nascimento", company: "Farmácia Saúde+", status: "perdido", priority: "baixa", source: "Google", value: 4000 },
  { id: "12", name: "Beatriz Lima", company: "Floricultura Jardim", status: "novo", priority: "média", source: "Facebook Ads", value: 1500 },
];

export const demoTasks = [
  { id: "1", title: "Criar campanha Black Friday - TechStore", client_name: "E-commerce TechStore", priority: "urgente", status: "em_progresso", due_date: "2024-01-10" },
  { id: "2", title: "Revisar métricas mensais - Bella Vita", client_name: "Clínica Estética Bella Vita", priority: "alta", status: "pendente", due_date: "2024-01-08" },
  { id: "3", title: "Aprovar artes do Instagram", client_name: "Academia FitLife", priority: "média", status: "pendente", due_date: "2024-01-09" },
  { id: "4", title: "Configurar pixel do Facebook", client_name: "Imobiliária Prime", priority: "alta", status: "concluida", due_date: "2024-01-05" },
  { id: "5", title: "Reunião de alinhamento mensal", client_name: "Restaurante Sabor & Arte", priority: "média", status: "pendente", due_date: "2024-01-12" },
  { id: "6", title: "Criar relatório de performance", client_name: "E-commerce TechStore", priority: "alta", status: "em_progresso", due_date: "2024-01-07" },
  { id: "7", title: "Otimizar campanha Google Ads", client_name: "Escritório Silva & Associados", priority: "urgente", status: "pendente", due_date: "2024-01-06" },
  { id: "8", title: "Gravar vídeo institucional", client_name: "Pet Shop Patinhas", priority: "baixa", status: "pendente", due_date: "2024-01-15" },
  { id: "9", title: "Atualizar site - página de serviços", client_name: "Clínica Estética Bella Vita", priority: "média", status: "concluida", due_date: "2024-01-03" },
  { id: "10", title: "Analisar concorrência", client_name: "Academia FitLife", priority: "baixa", status: "pendente", due_date: "2024-01-20" },
];

export const demoPosts = [
  { id: "1", title: "Promoção de Verão", client_name: "Academia FitLife", platform: "instagram", status: "publicado", scheduled_date: "2024-01-05" },
  { id: "2", title: "Novo tratamento facial", client_name: "Clínica Estética Bella Vita", platform: "instagram", status: "agendado", scheduled_date: "2024-01-10" },
  { id: "3", title: "Cardápio especial de inverno", client_name: "Restaurante Sabor & Arte", platform: "facebook", status: "aprovacao", scheduled_date: "2024-01-08" },
  { id: "4", title: "Apartamento em destaque", client_name: "Imobiliária Prime", platform: "instagram", status: "rascunho", scheduled_date: "2024-01-12" },
  { id: "5", title: "Oferta relâmpago", client_name: "E-commerce TechStore", platform: "facebook", status: "publicado", scheduled_date: "2024-01-04" },
  { id: "6", title: "Dicas de advocacia", client_name: "Escritório Silva & Associados", platform: "linkedin", status: "agendado", scheduled_date: "2024-01-11" },
  { id: "7", title: "Banho e tosa com desconto", client_name: "Pet Shop Patinhas", platform: "instagram", status: "aprovacao", scheduled_date: "2024-01-09" },
  { id: "8", title: "Matrículas abertas 2024", client_name: "Escola Fluent Idiomas", platform: "facebook", status: "publicado", scheduled_date: "2024-01-02" },
];

export const demoMeetings = [
  { id: "1", title: "Kickoff - Novo Cliente", client_name: "Auto Center Premium", date: "2024-01-10", time: "10:00", status: "agendada" },
  { id: "2", title: "Revisão de Campanha", client_name: "E-commerce TechStore", date: "2024-01-08", time: "14:00", status: "agendada" },
  { id: "3", title: "Alinhamento Mensal", client_name: "Clínica Estética Bella Vita", date: "2024-01-12", time: "09:00", status: "agendada" },
  { id: "4", title: "Apresentação de Resultados", client_name: "Imobiliária Prime", date: "2024-01-05", time: "15:00", status: "concluida" },
  { id: "5", title: "Brainstorm Criativo", client_name: "Academia FitLife", date: "2024-01-15", time: "11:00", status: "agendada" },
  { id: "6", title: "Treinamento de Redes Sociais", client_name: "Pet Shop Patinhas", date: "2024-01-03", time: "16:00", status: "concluida" },
];

export const demoActivities = [
  { id: "1", type: "lead", description: "Novo lead capturado", detail: "Carlos Mendes - Auto Center Premium", time: "Há 5 minutos" },
  { id: "2", type: "task", description: "Tarefa concluída", detail: "Configurar pixel do Facebook - Imobiliária Prime", time: "Há 15 minutos" },
  { id: "3", type: "client", description: "Pagamento recebido", detail: "E-commerce TechStore - R$ 8.500,00", time: "Há 1 hora" },
  { id: "4", type: "post", description: "Post publicado", detail: "Oferta relâmpago - TechStore", time: "Há 2 horas" },
  { id: "5", type: "meeting", description: "Reunião concluída", detail: "Apresentação de Resultados - Imobiliária Prime", time: "Há 3 horas" },
  { id: "6", type: "lead", description: "Lead qualificado", detail: "Lucas Pereira - Restaurante La Pasta", time: "Há 4 horas" },
  { id: "7", type: "task", description: "Nova tarefa criada", detail: "Criar campanha Black Friday - TechStore", time: "Há 5 horas" },
  { id: "8", type: "client", description: "Novo cliente adicionado", detail: "Pet Shop Patinhas", time: "Ontem" },
];

export const demoMetrics = {
  totalClients: 8,
  activeClients: 7,
  totalLeads: 12,
  newLeads: 3,
  convertedLeads: 2,
  totalMeetings: 6,
  upcomingMeetings: 4,
  completedMeetings: 2,
  totalTasks: 10,
  completedTasks: 2,
  pendingTasks: 6,
  overdueTasks: 2,
  inProgressTasks: 2,
  totalSocialPosts: 8,
  publishedPosts: 3,
  scheduledPosts: 2,
  monthlyRevenue: 36300,
  projectedRevenue: 42500,
  adSpend: 12800,
  leadConversionRate: 16.7,
  taskCompletionRate: 20,
};

export const getLeadsByStatus = () => {
  const statuses = ["novo", "contato", "qualificado", "proposta", "cliente", "perdido"];
  return statuses.map(status => ({
    status,
    leads: demoLeads.filter(lead => lead.status === status),
    count: demoLeads.filter(lead => lead.status === status).length,
  }));
};

export const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    novo: "Novo",
    contato: "Em Contato",
    qualificado: "Qualificado",
    proposta: "Proposta Enviada",
    cliente: "Cliente",
    perdido: "Perdido",
  };
  return labels[status] || status;
};

export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    novo: "bg-blue-500",
    contato: "bg-yellow-500",
    qualificado: "bg-purple-500",
    proposta: "bg-orange-500",
    cliente: "bg-green-500",
    perdido: "bg-gray-500",
  };
  return colors[status] || "bg-gray-500";
};

export const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    urgente: "text-red-600 bg-red-100",
    alta: "text-orange-600 bg-orange-100",
    média: "text-yellow-600 bg-yellow-100",
    baixa: "text-green-600 bg-green-100",
  };
  return colors[priority] || "text-gray-600 bg-gray-100";
};

export const getPlatformIcon = (platform: string) => {
  return platform;
};
