import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useProductTour } from '@/hooks/useProductTour';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Sparkles, 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Calendar,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Play
} from 'lucide-react';

const checklist = [
  {
    id: 'profile',
    icon: Users,
    title: 'Complete seu perfil',
    description: 'Adicione foto e informações pessoais'
  },
  {
    id: 'client',
    icon: DollarSign,
    title: 'Adicione seu primeiro cliente',
    description: 'Configure contratos e valores'
  },
  {
    id: 'task',
    icon: CheckSquare,
    title: 'Crie sua primeira tarefa',
    description: 'Organize o trabalho da equipe'
  },
  {
    id: 'meeting',
    icon: Calendar,
    title: 'Agende uma reunião',
    description: 'Planeje encontros com clientes'
  },
  {
    id: 'integrations',
    icon: TrendingUp,
    title: 'Configure integrações',
    description: 'Conecte Facebook Ads e outras ferramentas'
  }
];

export default function Welcome() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { startTour } = useProductTour();
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If no user, redirect to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // If user already saw welcome, redirect to dashboard
    if (profile?.welcome_seen) {
      navigate('/', { replace: true });
    }
  }, [user, profile, navigate]);

  const handleToggleItem = (itemId: string) => {
    setCompletedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleStartTour = async () => {
    setIsLoading(true);
    try {
      if (user) {
        await supabase
          .from('profiles')
          .update({ welcome_seen: true })
          .eq('user_id', user.id);
      }
      
      navigate('/', { replace: true });
      setTimeout(() => startTour(), 500);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao iniciar tour');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      if (user) {
        await supabase
          .from('profiles')
          .update({ welcome_seen: true, tour_completed: true })
          .eq('user_id', user.id);
      }
      
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao pular tour');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if no profile or already seen welcome
  if (!profile || profile.welcome_seen) {
    return null;
  }

  const progress = (completedItems.length / checklist.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">Bem-vindo ao Sistema! 🎉</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sua agência de marketing agora tem uma ferramenta completa para gestão de clientes, tarefas, financeiro e muito mais.
          </p>
        </div>

        {/* Main Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Tour Card */}
          <Card className="border-primary/50 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Tour Guiado</CardTitle>
                  <CardDescription>Recomendado • 5 minutos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Faça um tour interativo pelas principais funcionalidades do sistema. Vamos mostrar tudo que você precisa para começar!
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span>Dashboard e métricas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Gestão de leads (CRM)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span>Tarefas e projetos</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>Social Media Planner</span>
                </li>
              </ul>
              <Button 
                onClick={handleStartTour} 
                className="w-full"
                disabled={isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Começar Tour Guiado
              </Button>
            </CardContent>
          </Card>

          {/* Checklist Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Primeiros Passos</CardTitle>
              <CardDescription>
                Complete estes passos para aproveitar ao máximo o sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Checklist items */}
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleToggleItem(item.id)}
                  >
                    <Checkbox 
                      checked={completedItems.includes(item.id)}
                      onCheckedChange={() => handleToggleItem(item.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleSkip}
                disabled={isLoading}
              >
                Explorar por Conta Própria
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Você pode refazer o tour a qualquer momento clicando no botão de ajuda (?) no canto inferior direito
        </p>
      </div>
    </div>
  );
}
