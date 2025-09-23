import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, CheckSquare, Users, Calendar, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
const Index = () => {
  const {
    profile
  } = useAuth();
  const getRoleGreeting = () => {
    if (!profile) return "Bem-vindo";
    switch (profile.role) {
      case 'gestor_trafego':
        return `Bem-vindo, ${profile.name.split(' ')[0]}! 📊`;
      case 'designer':
        return `Bem-vindo, ${profile.name.split(' ')[0]}! 🎨`;
      case 'administrador':
        return `Bem-vindo, ${profile.name.split(' ')[0]}! 👑`;
      default:
        return `Bem-vindo, ${profile.name.split(' ')[0]}!`;
    }
  };
  const quickActions = [{
    title: "Nova Tarefa",
    description: "Criar uma nova tarefa geral",
    icon: Plus,
    action: () => {},
    // TODO: Navigate to task creation
    color: "bg-primary/10 text-primary"
  }, {
    title: "Novo Cliente",
    description: "Cadastrar um novo cliente",
    icon: Users,
    action: () => {},
    // TODO: Navigate to client creation
    color: "bg-green-500/10 text-green-600"
  }, {
    title: "Ver Tarefas",
    description: "Visualizar todas as tarefas",
    icon: CheckSquare,
    action: () => {},
    // TODO: Navigate to tasks
    color: "bg-blue-500/10 text-blue-600"
  }];
  return <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl text-gradient font-bold">
          {getRoleGreeting()}
        </h1>
        <p className="text-muted-foreground">
          Aqui está o resumo do seu dia na Agência Senseys
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas do Dia</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nenhuma tarefa pendente
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Próximas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nos próximos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nenhum alerta ativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ações Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action, index) => <Card key={index} className="card-modern cursor-pointer group" onClick={action.action}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>
      </div>

      {/* Recent Activity - Placeholder */}
      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Atividades Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <LayoutDashboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma atividade recente encontrada.</p>
            <p className="text-sm mt-2">
              As atividades aparecerão aqui conforme você usar o sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Index;