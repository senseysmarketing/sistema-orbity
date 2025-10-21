import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SocialMediaSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configurações de Social Media</h2>

      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aqui você poderá personalizar status customizados, tipos de conteúdo, 
            regras de aprovação e outros parâmetros do módulo de social media.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
