import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Code, Eye, TrendingUp, Sparkles, Save, Loader2 } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TemplateLibraryDialog } from "./TemplateLibraryDialog";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

interface CampaignBuilderProps {
  campaign: {
    subject: string;
    body: string;
    [key: string]: any;
  };
  setCampaign: React.Dispatch<React.SetStateAction<any>>;
  aiLoading: boolean;
  callAI: (type: string, prompt: string, agencyId?: string) => Promise<any>;
  campaignView: "editor" | "preview";
  setCampaignView: (view: "editor" | "preview") => void;
}

export function CampaignBuilder({ 
  campaign, 
  setCampaign, 
  aiLoading,
  callAI,
  campaignView, 
  setCampaignView 
}: CampaignBuilderProps) {
  const { currentAgency } = useAgency();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleSelectTemplate = (template: { subject: string; content: string }) => {
    setCampaign(prev => ({
      ...prev,
      subject: template.subject || prev.subject,
      body: template.content
    }));
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Por favor, informe um nome para o modelo");
      return;
    }

    if (!campaign.body || campaign.body === "<p></p>") {
      toast.error("O conteúdo do e-mail está vazio");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("email_templates")
        .insert({
          agency_id: currentAgency?.id,
          name: templateName,
          subject: campaign.subject,
          content: campaign.body
        });

      if (error) throw error;

      toast.success("Modelo salvo com sucesso!");
      setSaveDialogOpen(false);
      setTemplateName("");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar modelo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt) return;
    try {
      const result = await callAI("email_generation", aiPrompt, currentAgency?.id);
      const html = typeof result === "string" ? result : result?.html;
      if (html) {
        setCampaign(prev => ({ ...prev, body: html }));
        setAiPromptOpen(false);
        setAiPrompt("");
        toast.success("Conteúdo gerado com sucesso!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="border shadow-sm overflow-hidden min-h-[600px] flex flex-col">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b space-y-4 sm:space-y-0">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Estúdio de Criação
          </CardTitle>
          <Separator orientation="vertical" className="hidden sm:block h-6" />
          <ToggleGroup 
            type="single" 
            value={campaignView} 
            onValueChange={(val) => val && setCampaignView(val as any)}
            size="sm"
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem value="editor" aria-label="Editor mode" className="gap-2">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Editor</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="preview" aria-label="Preview mode" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Visualização</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TemplateLibraryDialog 
            onSelectTemplate={handleSelectTemplate} 
            currentContent={campaign.body} 
          />
          
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-primary">
                <Save className="h-4 w-4" />
                Salvar como Modelo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salvar como Modelo</DialogTitle>
                <DialogDescription>
                  Dê um nome para este modelo para encontrá-lo facilmente depois.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nome do Modelo</Label>
                  <Input 
                    id="template-name" 
                    placeholder="Ex: Relatório Mensal de Tráfego" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveAsTemplate} disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar Modelo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Separator orientation="vertical" className="hidden sm:block h-6 mx-1" />

          <Dialog open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="action" 
                size="sm" 
                className="gap-2 shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                IA Assist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>O que você quer escrever?</DialogTitle>
                <DialogDescription>
                  Descreva o objetivo do e-mail e nossa IA criará o conteúdo para você.
                  <br />
                  <span className="text-[10px] text-primary font-medium">
                    Dica: Você pode pedir para a IA usar as variáveis {"{{Nome}}"} e {"{{Telefone}}"} no texto.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea 
                  placeholder="Ex: Oferta de serviço de gestão de tráfego para novos leads..." 
                  value={aiPrompt} 
                  onChange={e => setAiPrompt(e.target.value)} 
                  rows={4} 
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAiPromptOpen(false)}>Cancelar</Button>
                <Button onClick={handleAIGenerate} disabled={aiLoading || !aiPrompt}>
                  {aiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gerar Conteúdo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <div className="flex-1 overflow-hidden">
        {campaignView === 'editor' ? (
          <RichTextEditor 
            value={campaign.body} 
            onChange={(val) => setCampaign(prev => ({ ...prev, body: val }))} 
            placeholder="Escreva o conteúdo persuasivo da sua campanha..."
          />
        ) : (
          <div className="p-8 h-full bg-muted/20 overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-white shadow-lg border rounded-lg p-10 min-h-[600px] prose prose-sm max-w-none dark:bg-slate-900 dark:border-slate-800">
              <div dangerouslySetInnerHTML={{ __html: campaign.body || '<p class="text-muted-foreground italic text-center">Nenhum conteúdo para visualizar</p>' }} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

