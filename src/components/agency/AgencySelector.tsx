import { useState } from 'react';
import { Building, ChevronDown, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAgency } from '@/hooks/useAgency';
import { CreateAgencyDialog } from './CreateAgencyDialog';

export function AgencySelector() {
  const { 
    currentAgency, 
    userAgencies, 
    switchAgency, 
    loading,
    isAgencyAdmin 
  } = useAgency();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-2">
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!currentAgency) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowCreateDialog(true)}
        className="justify-start w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Criar Agência
      </Button>
    );
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-500';
      case 'basic': return 'bg-blue-500';
      case 'pro': return 'bg-purple-500';
      case 'enterprise': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free': return 'Grátis';
      case 'basic': return 'Básico';
      case 'pro': return 'Pro';
      case 'enterprise': return 'Enterprise';
      default: return plan;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-left">
                  {currentAgency.name}
                </span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getPlanColor(currentAgency.subscription_plan)} text-white`}
                >
                  {getPlanLabel(currentAgency.subscription_plan)}
                </Badge>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel>Suas Agências</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {userAgencies.map((agency) => (
            <DropdownMenuItem
              key={agency.id}
              onClick={() => switchAgency(agency.id)}
              className="flex items-center justify-between p-3"
            >
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                  <Building className="h-3 w-3 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{agency.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs w-fit ${getPlanColor(agency.subscription_plan)} text-white`}
                  >
                    {getPlanLabel(agency.subscription_plan)}
                  </Badge>
                </div>
              </div>
              {currentAgency?.id === agency.id && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Agência
          </DropdownMenuItem>
          
          {isAgencyAdmin() && (
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Configurações da Agência
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <CreateAgencyDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />
    </>
  );
}