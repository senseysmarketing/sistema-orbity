export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick?: () => void;
  };
}

export const tourSteps: TourStep[] = [
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: '🎯 Dashboard - Visão Geral',
    content: 'Aqui você tem uma visão completa da sua agência: métricas importantes, atividades recentes e tarefas pendentes. É o centro de controle do seu negócio.',
    placement: 'bottom'
  },
  {
    id: 'crm',
    target: '[data-tour="crm"]',
    title: '💼 CRM - Gestão de Leads',
    content: 'Organize seus leads em um kanban visual. Acompanhe o funil de vendas desde o primeiro contato até o fechamento. Nunca mais perca oportunidades!',
    placement: 'right'
  },
  {
    id: 'tasks',
    target: '[data-tour="tasks"]',
    title: '✅ Tarefas - Organize seu Trabalho',
    content: 'Crie tarefas, atribua para membros da equipe, defina prazos e acompanhe o progresso. Mantenha todos alinhados e produtivos.',
    placement: 'right'
  },
  {
    id: 'agenda',
    target: '[data-tour="agenda"]',
    title: '📅 Agenda - Reuniões e Eventos',
    content: 'Agende reuniões com clientes e prospects, convide participantes e registre anotações importantes. Tudo sincronizado em um só lugar.',
    placement: 'right'
  },
  {
    id: 'social-media',
    target: '[data-tour="social-media"]',
    title: '📱 Social Media - Planejamento de Conteúdo',
    content: 'Planeje posts, organize em calendário, gerencie aprovações e acompanhe métricas. Seu hub completo de marketing de conteúdo.',
    placement: 'right'
  },
  {
    id: 'traffic',
    target: '[data-tour="traffic"]',
    title: '📊 Tráfego Pago - Facebook Ads',
    content: 'Conecte sua conta do Facebook Ads, monitore campanhas, acompanhe métricas de desempenho e saldos de contas em tempo real.',
    placement: 'right'
  },
  {
    id: 'admin',
    target: '[data-tour="admin"]',
    title: '💰 Admin - Gestão Financeira',
    content: 'Controle clientes, recebimentos, despesas e folha de pagamento. Visualize projeções de receita e mantenha sua agência lucrativa.',
    placement: 'right'
  }
];
