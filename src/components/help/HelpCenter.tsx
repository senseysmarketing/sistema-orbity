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

        <div className="border-t pt-4 mt-6">
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Encontrou um bug ou tem uma sugestão?</CardTitle>
              <CardDescription>
                Seu feedback ajuda o Orbity a ficar cada vez melhor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={`https://wa.me/5516994481535?text=${encodeURIComponent('Olá! Quero enviar um feedback/reportar um bug no Orbity:')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full gap-2 bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2.5 rounded-md transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Enviar feedback no WhatsApp
              </a>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
