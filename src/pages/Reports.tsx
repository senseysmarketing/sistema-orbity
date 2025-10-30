import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Reports() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Relatórios</CardTitle>
          <CardDescription className="text-lg">
            Nova experiência de relatórios em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle className="text-lg font-semibold">Em breve</AlertTitle>
            <AlertDescription className="text-base mt-2">
              Estamos trabalhando em uma nova versão da tela de relatórios com recursos avançados de análise e visualização de dados. Em breve você terá acesso a insights ainda mais poderosos sobre seu negócio.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}