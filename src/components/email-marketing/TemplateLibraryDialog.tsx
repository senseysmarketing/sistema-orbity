import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Layout, 
  Trash2, 
  Plus, 
  FileText, 
  Calendar, 
  Sparkles,
  Check,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Template {
  id: string;
  name: string;
  subject: string | null;
  content: string;
  created_at: string;
}

interface TemplateLibraryDialogProps {
  onSelectTemplate: (template: { subject: string; content: string }) => void;
  currentContent?: string;
}

const SYSTEM_TEMPLATES = [
  {
    id: "sys-1",
    name: "Prospecção B2B (Foco em agência)",
    subject: "Parceria Estratégica: {{Nome}} + Nossa Agência",
    content: `
      <p>Olá <strong>{{Nome}}</strong>,</p>
      <p>Acompanho o trabalho da sua empresa há algum tempo e vejo um grande potencial de escala através de estratégias de tráfego pago e funis de conversão.</p>
      <p>Gostaria de agendar uma breve conversa de 15 minutos para mostrar como podemos implementar o "Jeito Senseys" de prospecção no seu negócio.</p>
      <p>Você teria disponibilidade na próxima terça ou quarta-feira?</p>
      <p>Atenciosamente,<br>Equipe Comercial</p>
    `,
    category: "Sugestões Orbity"
  },
  {
    id: "sys-2",
    name: "Boas-vindas ao Cliente (Onboarding)",
    subject: "Bem-vindo(a) à bordo! Próximos passos",
    content: `
      <p>Olá <strong>{{Nome}}</strong>,</p>
      <p>Estamos muito felizes em ter você como nosso novo parceiro!</p>
      <p>Para começarmos com o pé direito, precisamos que você preencha nosso formulário de onboarding e nos conceda os acessos necessários às contas de anúncios.</p>
      <p><strong>Próximos passos:</strong></p>
      <ol>
        <li>Preencher o briefing inicial</li>
        <li>Agendar nossa reunião de Kick-off</li>
        <li>Aprovar o planejamento do primeiro mês</li>
      </ol>
      <p>Qualquer dúvida, estamos à disposição no WhatsApp.</p>
      <p>Abraços!</p>
    `,
    category: "Sugestões Orbity"
  },
  {
    id: "sys-3",
    name: "Aviso de Vencimento de Fatura (Cobrança)",
    subject: "Aviso importante: Sua fatura vence em breve",
    content: `
      <p>Olá <strong>{{Nome}}</strong>,</p>
      <p>Gostaríamos de lembrar que sua fatura referente aos serviços mensais da agência vence em 3 dias.</p>
      <p>O pagamento em dia garante a continuidade das nossas campanhas e a manutenção da performance que estamos alcançando.</p>
      <p>Caso já tenha efetuado o pagamento, por favor desconsidere este e-mail.</p>
      <p>Um abraço,<br>Setor Financeiro</p>
    `,
    category: "Sugestões Orbity"
  }
];

export function TemplateLibraryDialog({ onSelectTemplate, currentContent }: TemplateLibraryDialogProps) {
  const { currentAgency } = useAgency();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<{ subject: string; content: string } | null>(null);

  useEffect(() => {
    if (isOpen && currentAgency?.id) {
      fetchTemplates();
    }
  }, [isOpen, currentAgency?.id]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("agency_id", currentAgency?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar modelos");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;
    
    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Modelo excluído com sucesso");
      fetchTemplates();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir modelo");
    }
  }

  const handleSelect = (template: { subject: string | null; content: string }) => {
    const templateData = { 
      subject: template.subject || "", 
      content: template.content 
    };

    if (currentContent && currentContent !== "<p></p>" && currentContent !== "") {
      setPendingTemplate(templateData);
      setConfirmOpen(true);
    } else {
      onSelectTemplate(templateData);
      setIsOpen(false);
      toast.success("Modelo carregado com sucesso!");
    }
  };

  const confirmAndSelect = () => {
    if (pendingTemplate) {
      onSelectTemplate(pendingTemplate);
      setConfirmOpen(false);
      setIsOpen(false);
      toast.success("Modelo carregado com sucesso!");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Layout className="h-4 w-4" />
            Meus Modelos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Biblioteca de Modelos</DialogTitle>
            <DialogDescription>
              Gerencie seus modelos de e-mail e reutilize-os em suas campanhas.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="mine" className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="mine">Meus Modelos</TabsTrigger>
              <TabsTrigger value="system" className="gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Sugestões Orbity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mine" className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="bg-muted p-4 rounded-full">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Você ainda não salvou nenhum modelo.</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Escreva um e-mail no editor e clique em "Salvar como Modelo" para vê-lo aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {templates.map((template) => (
                    <div 
                      key={template.id} 
                      className="group border rounded-xl p-4 bg-card hover:border-primary/50 transition-all cursor-pointer relative"
                      onClick={() => handleSelect(template)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold truncate pr-8">{template.name}</h4>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(template.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                        {template.subject || "Sem assunto padrão"}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(template.created_at), "dd/MM/yyyy")}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          Usar Modelo
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="system" className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {SYSTEM_TEMPLATES.map((template) => (
                  <div 
                    key={template.id} 
                    className="group border rounded-xl p-4 bg-primary/5 border-primary/20 hover:border-primary/50 transition-all cursor-pointer relative"
                    onClick={() => handleSelect(template)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1">
                        <h4 className="font-semibold truncate">{template.name}</h4>
                        <Badge variant="secondary" className="w-fit text-[10px] h-4 px-1.5 uppercase font-bold tracking-wider">
                          Sugestão Orbity
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 italic">
                      {template.subject}
                    </p>
                    <div className="flex items-center justify-end mt-auto">
                      <Button variant="secondary" size="sm" className="h-7 text-xs gap-1 bg-primary/10 hover:bg-primary/20 text-primary border-none">
                        Usar Sugestão
                        <Sparkles className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning text-orange-500" />
              Substituir conteúdo atual?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você já escreveu algo no editor. Carregar este modelo irá substituir todo o conteúdo atual. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAndSelect}>Substituir e Carregar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
