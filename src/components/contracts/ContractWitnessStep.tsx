import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";

interface ContractWitnessStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

export default function ContractWitnessStep({ data, onUpdate }: ContractWitnessStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Datas do Contrato</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_date">Data do Contrato</Label>
            <Input
              id="contract_date"
              type="date"
              value={data.contract_date || ""}
              onChange={(e) => onUpdate({ contract_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Início da Vigência</Label>
            <Input
              id="start_date"
              type="date"
              value={data.start_date || ""}
              onChange={(e) => onUpdate({ start_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">Término (Opcional)</Label>
            <Input
              id="end_date"
              type="date"
              value={data.end_date || ""}
              onChange={(e) => onUpdate({ end_date: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Forma de Pagamento</h3>
        <div className="space-y-2">
          <Label htmlFor="payment_terms">Condições de Pagamento</Label>
          <Textarea
            id="payment_terms"
            value={data.payment_terms || ""}
            onChange={(e) => onUpdate({ payment_terms: e.target.value })}
            placeholder="Ex: Pagamento mensal até o dia 10 de cada mês via PIX ou boleto bancário"
            rows={3}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Testemunhas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">Testemunha 1 *</h4>
            <div className="space-y-2">
              <Label htmlFor="witness1_name">Nome Completo</Label>
              <Input
                id="witness1_name"
                value={data.witness1_name || ""}
                onChange={(e) => onUpdate({ witness1_name: e.target.value })}
                placeholder="Nome da primeira testemunha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="witness1_cpf">CPF</Label>
              <Input
                id="witness1_cpf"
                value={data.witness1_cpf || ""}
                onChange={(e) => onUpdate({ witness1_cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Testemunha 2 *</h4>
            <div className="space-y-2">
              <Label htmlFor="witness2_name">Nome Completo</Label>
              <Input
                id="witness2_name"
                value={data.witness2_name || ""}
                onChange={(e) => onUpdate({ witness2_name: e.target.value })}
                placeholder="Nome da segunda testemunha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="witness2_cpf">CPF</Label>
              <Input
                id="witness2_cpf"
                value={data.witness2_cpf || ""}
                onChange={(e) => onUpdate({ witness2_cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Cláusulas Personalizadas (Opcional)</h3>
        <div className="space-y-2">
          <Label htmlFor="custom_clauses">Cláusulas Adicionais</Label>
          <Textarea
            id="custom_clauses"
            value={data.custom_clauses || ""}
            onChange={(e) => onUpdate({ custom_clauses: e.target.value })}
            placeholder="Adicione cláusulas específicas para este contrato..."
            rows={6}
          />
        </div>
      </div>
    </div>
  );
}
