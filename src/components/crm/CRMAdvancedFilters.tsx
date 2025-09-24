import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FilterState {
  status: string[];
  priority: string[];
  source: string[];
  assignedTo: string[];
  valueRange: { min: number | null; max: number | null };
  dateRange: { from: Date | null; to: Date | null };
  tags: string[];
  hasNextContact: boolean | null;
  followUpOverdue: boolean | null;
}

interface CRMAdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

const statusOptions = [
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'negotiation', label: 'Negociação' },
  { value: 'won', label: 'Ganho' },
  { value: 'lost', label: 'Perdido' },
];

const priorityOptions = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

const sourceOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Redes Sociais' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'referral', label: 'Indicação' },
  { value: 'event', label: 'Evento' },
  { value: 'advertisement', label: 'Anúncio' },
];

export function CRMAdvancedFilters({ filters, onFiltersChange, onClearFilters }: CRMAdvancedFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: 'status' | 'priority' | 'source' | 'assignedTo' | 'tags', value: string) => {
    const currentArray = filters[key] as string[];
    const updatedArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, updatedArray);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.source.length > 0) count++;
    if (filters.assignedTo.length > 0) count++;
    if (filters.valueRange.min !== null || filters.valueRange.max !== null) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.tags.length > 0) count++;
    if (filters.hasNextContact !== null) count++;
    if (filters.followUpOverdue !== null) count++;
    return count;
  };

  const getActiveFiltersDisplay = () => {
    const active = [];
    if (filters.status.length > 0) active.push(`Status (${filters.status.length})`);
    if (filters.priority.length > 0) active.push(`Prioridade (${filters.priority.length})`);
    if (filters.source.length > 0) active.push(`Origem (${filters.source.length})`);
    if (filters.valueRange.min !== null || filters.valueRange.max !== null) active.push('Faixa de Valor');
    if (filters.dateRange.from || filters.dateRange.to) active.push('Período');
    if (filters.hasNextContact !== null) active.push('Follow-up');
    if (filters.followUpOverdue !== null) active.push('Atraso');
    return active;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">{getActiveFiltersCount()}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getActiveFiltersCount() > 0 && (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </div>
        {getActiveFiltersCount() > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {getActiveFiltersDisplay().map((filter, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {filter}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      {showFilters && (
        <CardContent className="space-y-6">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.status.includes(option.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayFilter('status', option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.priority.includes(option.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayFilter('priority', option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Source Filter */}
          <div className="space-y-2">
            <Label>Origem</Label>
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.source.includes(option.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayFilter('source', option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Value Range Filter */}
          <div className="space-y-2">
            <Label>Faixa de Valor (R$)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder="Valor mínimo"
                  value={filters.valueRange.min || ''}
                  onChange={(e) => updateFilter('valueRange', {
                    ...filters.valueRange,
                    min: e.target.value ? parseFloat(e.target.value) : null
                  })}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Valor máximo"
                  value={filters.valueRange.max || ''}
                  onChange={(e) => updateFilter('valueRange', {
                    ...filters.valueRange,
                    max: e.target.value ? parseFloat(e.target.value) : null
                  })}
                />
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>Período de Criação</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.from || undefined}
                    onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, from: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !filters.dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.to || undefined}
                    onSelect={(date) => updateFilter('dateRange', { ...filters.dateRange, to: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Follow-up Filters */}
          <div className="space-y-2">
            <Label>Follow-up</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.hasNextContact === true ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilter('hasNextContact', filters.hasNextContact === true ? null : true)}
              >
                Com Follow-up Agendado
              </Button>
              <Button
                variant={filters.hasNextContact === false ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilter('hasNextContact', filters.hasNextContact === false ? null : false)}
              >
                Sem Follow-up
              </Button>
              <Button
                variant={filters.followUpOverdue === true ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilter('followUpOverdue', filters.followUpOverdue === true ? null : true)}
              >
                Follow-up em Atraso
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}