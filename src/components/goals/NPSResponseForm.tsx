import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface NPSResponseFormProps {
  periodId: string;
  agencyId: string;
  onAdded: () => void;
}

function getCategory(score: number): string {
  if (score >= 9) return "promoter";
  if (score >= 7) return "neutral";
  return "detractor";
}

export function NPSResponseForm({ periodId, agencyId, onAdded }: NPSResponseFormProps) {
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");
  const [score, setScore] = useState<number>(10);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setSaving(true);
    const { error } = await supabase.from("nps_responses").insert([{
      agency_id: agencyId,
      period_id: periodId,
      client_name: clientName.trim(),
      score,
      category: getCategory(score),
      comment: comment.trim() || null,
    }]);

    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setClientName("");
      setScore(10);
      setComment("");
      onAdded();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Nova Resposta NPS</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Nome do Cliente</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Empresa XYZ"
              required
            />
          </div>
          <div>
            <Label className="text-xs">Nota (0-10)</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Comentário (opcional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Feedback do cliente..."
              rows={2}
            />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={saving}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
