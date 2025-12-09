import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Users, Briefcase, BarChart3, Zap, GraduationCap } from "lucide-react";
import { Meeting } from "@/hooks/useMeetings";

interface MeetingTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  data: {
    title: string;
    description: string;
    meeting_type: Meeting["meeting_type"];
    duration: number;
  };
}

const templates: MeetingTemplate[] = [
  {
    id: "onboarding",
    name: "Onboarding de Cliente",
    icon: <GraduationCap className="h-4 w-4" />,
    data: {
      title: "Onboarding - ",
      description: "Apresentação da agência, alinhamento de expectativas, coleta de acessos e informações iniciais.",
      meeting_type: "client",
      duration: 60,
    },
  },
  {
    id: "commercial",
    name: "Apresentação Comercial",
    icon: <Briefcase className="h-4 w-4" />,
    data: {
      title: "Apresentação Comercial - ",
      description: "Apresentação de serviços, cases de sucesso e proposta comercial.",
      meeting_type: "commercial",
      duration: 45,
    },
  },
  {
    id: "daily",
    name: "Daily Interna",
    icon: <Users className="h-4 w-4" />,
    data: {
      title: "Daily",
      description: "Alinhamento rápido da equipe sobre atividades do dia.",
      meeting_type: "internal",
      duration: 15,
    },
  },
  {
    id: "results",
    name: "Reunião de Resultados",
    icon: <BarChart3 className="h-4 w-4" />,
    data: {
      title: "Resultados Mensais - ",
      description: "Apresentação de métricas, análise de desempenho e planejamento do próximo período.",
      meeting_type: "results",
      duration: 60,
    },
  },
  {
    id: "quick_call",
    name: "Call Rápida",
    icon: <Zap className="h-4 w-4" />,
    data: {
      title: "Call Rápida - ",
      description: "Alinhamento rápido sobre tema específico.",
      meeting_type: "quick_call",
      duration: 15,
    },
  },
  {
    id: "workshop",
    name: "Workshop",
    icon: <FileText className="h-4 w-4" />,
    data: {
      title: "Workshop - ",
      description: "Sessão prática de trabalho colaborativo.",
      meeting_type: "workshop",
      duration: 120,
    },
  },
];

interface MeetingTemplateSelectorProps {
  onSelect: (template: MeetingTemplate["data"]) => void;
}

export const MeetingTemplateSelector = ({ onSelect }: MeetingTemplateSelectorProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Usar Template
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {templates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => onSelect(template.data)}
            className="gap-2 cursor-pointer"
          >
            {template.icon}
            <span>{template.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
