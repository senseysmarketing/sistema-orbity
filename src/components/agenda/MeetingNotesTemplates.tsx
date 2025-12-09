import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Briefcase, BarChart3, Users } from "lucide-react";

interface NotesTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  content: string;
}

const templates: NotesTemplate[] = [
  {
    id: "standard",
    name: "Ata Padrão",
    icon: <FileText className="h-4 w-4" />,
    content: `## Pauta
- 

## Discussões
- 

## Decisões Tomadas
- 

## Próximos Passos
- `,
  },
  {
    id: "commercial",
    name: "Reunião Comercial",
    icon: <Briefcase className="h-4 w-4" />,
    content: `## Briefing do Cliente
- Empresa:
- Setor:
- Objetivo:

## Necessidades Identificadas
- 

## Objeções/Dúvidas
- 

## Proposta Apresentada
- 

## Próximos Passos
- `,
  },
  {
    id: "results",
    name: "Reunião de Resultados",
    icon: <BarChart3 className="h-4 w-4" />,
    content: `## Período Analisado
- 

## Principais Métricas
- Alcance:
- Engajamento:
- Conversões:
- ROI:

## Destaques Positivos
- 

## Pontos de Melhoria
- 

## Plano para Próximo Período
- 

## Metas Definidas
- `,
  },
  {
    id: "internal",
    name: "Alinhamento Interno",
    icon: <Users className="h-4 w-4" />,
    content: `## Participantes
- 

## Status dos Projetos
- 

## Impedimentos
- 

## Prioridades da Semana
- 

## Observações
- `,
  },
];

interface MeetingNotesTemplatesProps {
  onSelect: (content: string) => void;
}

export const MeetingNotesTemplates = ({ onSelect }: MeetingNotesTemplatesProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Template
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {templates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => onSelect(template.content)}
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
