import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductTour } from '@/hooks/useProductTour';
import { 
  BookOpen, 
  Video, 
  Lightbulb, 
  RotateCcw,
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  MessageSquare,
  TrendingUp,
  DollarSign
} from 'lucide-react';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickGuides = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Visão geral de métricas e atividades',
    color: 'text-blue-500'
  },
  {
    icon: Users,
    title: 'CRM - Leads',
    description: 'Gestão completa do funil de vendas',
    color: 'text-green-500'
  },
  {
    icon: CheckSquare,
    title: 'Tarefas',
    description: 'Organize e acompanhe o trabalho da equipe',
    color: 'text-orange-500'
  },
  {
    icon: Calendar,
    title: 'Agenda',
    description: 'Agende reuniões e eventos',
    color: 'text-purple-500'
  },
  {
    icon: MessageSquare,
    title: 'Social Media',
    description: 'Planejamento de conteúdo',
    color: 'text-pink-500'
  },
  {
    icon: TrendingUp,
    title: 'Tráfego Pago',
    description: 'Monitore campanhas do Facebook Ads',
    color: 'text-red-500'
  },
  {
    icon: DollarSign,
    title: 'Financeiro',
    description: 'Controle de receitas e despesas',
    color: 'text-emerald-500'
  }
];

const tips = [
  'Use atalhos de teclado para navegar mais rápido pelo sistema',
  'Crie lembretes para não esquecer de fazer follow-up com seus leads',
  'Configure notificações para receber alertas importantes',
  'Use tags para organizar melhor seus leads e tarefas',
  'Acompanhe métricas diariamente no Dashboard para tomar decisões estratégicas',
  'Conecte sua conta do Facebook Ads para monitorar campanhas em tempo real',
  'Aproveite o Kanban do CRM para visualizar seu funil de vendas'
];

export function HelpCenter({ isOpen, onClose }: HelpCenterProps) {
  const { startTour } = useProductTour();
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  const handleStartTour = () => {
    onClose();
    setTimeout(() => startTour(), 300);
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

        <Tabs defaultValue="guides" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guides">
              <BookOpen className="h-4 w-4 mr-2" />
              Guias
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="h-4 w-4 mr-2" />
              Vídeos
            </TabsTrigger>
            <TabsTrigger value="tips">
              <Lightbulb className="h-4 w-4 mr-2" />
              Dicas
            </TabsTrigger>
          </TabsList>

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
                <Card key={guide.title} className="hover:bg-muted/50 transition-colors cursor-pointer">
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

          <TabsContent value="tips" className="space-y-4 mt-4">
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Dica do Dia</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{randomTip}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dicas Rápidas</CardTitle>
                <CardDescription>
                  Maximize sua produtividade com essas dicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
