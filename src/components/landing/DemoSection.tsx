import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoSidebar } from "./demo/DemoSidebar";
import { DemoDashboard } from "./demo/DemoDashboard";

export function DemoSection() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background via-[#1c102f]/5 to-background">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-[#1c102f]/10 text-[#1c102f] border-[#1c102f]/20 hover:bg-[#1c102f]/20">
            <Sparkles className="h-3 w-3 mr-1" />
            Demonstração Interativa
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Veja o Sistema{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1c102f] to-purple-600">
              em Ação
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore um dashboard real com dados fictícios. Navegue entre as seções e descubra 
            como a Senseys pode transformar a gestão da sua agência.
          </p>
        </div>

        {/* Demo Container */}
        <div className="relative max-w-5xl mx-auto">
          {/* Badge de Demo */}
          <div className="absolute -top-3 right-4 z-20">
            <Badge className="bg-[#1c102f] text-white px-3 py-1 shadow-lg">
              <Eye className="h-3 w-3 mr-1" />
              Modo Demonstração
            </Badge>
          </div>

          {/* Browser Chrome */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-t-xl p-3 flex items-center gap-3 border border-b-0 border-gray-200 dark:border-gray-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white dark:bg-gray-700 rounded-lg px-4 py-1.5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-[#1c102f]/20 flex items-center justify-center">
                <span className="text-[8px] font-bold text-[#1c102f]">S</span>
              </div>
              app.senseys.com/dashboard
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="bg-background rounded-b-xl border border-t-0 border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xl">
            <div className="flex h-[500px] md:h-[550px]">
              {/* Sidebar */}
              <DemoSidebar activeTab={activeTab} onTabChange={setActiveTab} />
              
              {/* Main Content */}
              <div className="flex-1 overflow-hidden bg-muted/30">
                <DemoDashboard activeTab={activeTab} />
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[#1c102f]/10 rounded-full blur-2xl" />
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <p className="text-sm text-muted-foreground mb-4">
            Gostou do que viu? Comece agora mesmo!
          </p>
          <Button 
            size="lg" 
            className="bg-[#1c102f] hover:bg-[#1c102f]/90 text-white gap-2"
            onClick={() => navigate("/onboarding")}
          >
            Começar Teste Grátis de 7 Dias
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
