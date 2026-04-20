import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductTour } from '@/hooks/useProductTour';
import { useNavigate } from 'react-router-dom';
import { HelpAIChat } from './HelpAIChat';
import { 
  BookOpen, 
  Video, 
  Sparkles,
  RotateCcw,
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  MessageSquare,
  TrendingUp,
  DollarSign,
  BarChart3
} from 'lucide-react';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickGuides = [
  { icon: LayoutDashboard, title: 'Dashboard', description: 'Visão geral de métricas e atividades', color: 'text-blue-500', route: '/dashboard' },
  { icon: Users, title: 'CRM - Leads', description: 'Gestão completa do funil de vendas', color: 'text-green-500', route: '/dashboard/crm' },
  { icon: CheckSquare, title: 'Tarefas', description: 'Organize e acompanhe o trabalho da equipe', color: 'text-orange-500', route: '/dashboard/tasks' },
  { icon: Calendar, title: 'Agenda', description: 'Agende reuniões e eventos', color: 'text-purple-500', route: '/dashboard/agenda' },
  { icon: MessageSquare, title: 'Social Media', description: 'Planejamento de conteúdo', color: 'text-pink-500', route: '/dashboard/social-media' },
  { icon: TrendingUp, title: 'Tráfego Pago', description: 'Monitore campanhas do Facebook Ads', color: 'text-red-500', route: '/dashboard/traffic' },
  { icon: BarChart3, title: 'Relatórios', description: 'Relatórios e links mágicos para clientes', color: 'text-cyan-500', route: '/dashboard/reports' },
  { icon: DollarSign, title: 'Financeiro', description: 'Controle de receitas e despesas', color: 'text-emerald-500', route: '/dashboard/admin' },
];

export function HelpCenter({ isOpen, onClose }: HelpCenterProps) {
  const { startTour } = useProductTour();
  const navigate = useNavigate();

  const handleStartTour = () => {
    onClose();
    setTimeout(() => startTour(), 300);
  };

  const handleNavigateToGuide = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Central de Ajuda</SheetTitle>
          <SheetDescription>
            Aprenda a usar todas as funcionalidades do sistema
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="ai" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              IA Suporte
            </TabsTrigger>
            <TabsTrigger value="guides">
              <BookOpen className="h-4 w-4 mr-2" />
              Guias
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="h-4 w-4 mr-2" />
              Vídeos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4">
            <HelpAIChat />
          </TabsContent>

          <TabsContent value="guides" className="space-y-4 mt-4">
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Tour Guiado</CardTitle>
                </div>
                <CardDescription>
                  Faça um tour interativo pelas principais funcionalidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleStartTour} className="w-full">
                  Iniciar Tour Guiado
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-3">
              {quickGuides.map((guide) => (
                <Card 
                  key={guide.title} 
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleNavigateToGuide(guide.route)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <guide.icon className={`h-5 w-5 ${guide.color} mt-0.5`} />
                      <div>
                        <CardTitle className="text-base">{guide.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {guide.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vídeos Tutoriais</CardTitle>
                <CardDescription>
                  Aprenda de forma visual com nossos tutoriais em vídeo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Em breve você terá acesso a uma biblioteca completa de vídeos tutoriais explicando cada funcionalidade do sistema.
                </p>
                <div className="bg-muted rounded-lg p-8 text-center">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Conteúdo em produção</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
