import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, FileDown } from "lucide-react";
import ContractClientStep from "./ContractClientStep";
import ContractServicesStep from "./ContractServicesStep";
import ContractWitnessStep from "./ContractWitnessStep";
import ContractPreview from "./ContractPreview";

interface ContractData {
  // Client data
  client_id?: string;
  client_name: string;
  client_cpf_cnpj: string;
  client_address: string;
  client_city: string;
  client_state: string;
  client_phone: string;
  client_email: string;
  
  // Services
  services: Array<{
    name: string;
    description: string;
    value: number;
  }>;
  total_value: number;
  
  // Witnesses and terms
  witness1_name: string;
  witness1_cpf: string;
  witness2_name: string;
  witness2_cpf: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  payment_terms: string;
  custom_clauses: string;
}

interface ContractGeneratorProps {
  onCancel: () => void;
  onComplete: () => void;
}

export default function ContractGenerator({ onCancel, onComplete }: ContractGeneratorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [contractData, setContractData] = useState<Partial<ContractData>>({
    services: [],
    total_value: 0,
    contract_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const stepTitles = [
    "Dados do Cliente",
    "Serviços Contratados",
    "Termos e Testemunhas",
    "Revisão e Geração"
  ];

  const updateData = (data: Partial<ContractData>) => {
    setContractData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return contractData.client_name && contractData.client_cpf_cnpj;
      case 2:
        return contractData.services && contractData.services.length > 0;
      case 3:
        return contractData.witness1_name && contractData.witness2_name;
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Etapa {currentStep} de {totalSteps}: {stepTitles[currentStep - 1]}
          </h2>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <ContractClientStep data={contractData} onUpdate={updateData} />
        )}
        {currentStep === 2 && (
          <ContractServicesStep data={contractData} onUpdate={updateData} />
        )}
        {currentStep === 3 && (
          <ContractWitnessStep data={contractData} onUpdate={updateData} />
        )}
        {currentStep === 4 && (
          <ContractPreview data={contractData as ContractData} onComplete={onComplete} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 1 ? "Cancelar" : "Voltar"}
        </Button>

        {currentStep < totalSteps && (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
