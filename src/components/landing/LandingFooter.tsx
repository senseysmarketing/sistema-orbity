import { useNavigate } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="bg-muted/30 border-t py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Plataforma</h3>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => navigate("/lp")} 
                className="text-muted-foreground hover:text-foreground text-left transition-colors"
              >
                Início
              </button>
              <button 
                onClick={() => navigate("/lp#features")} 
                className="text-muted-foreground hover:text-foreground text-left transition-colors"
              >
                Funcionalidades
              </button>
              <button 
                onClick={() => navigate("/lp#pricing")} 
                className="text-muted-foreground hover:text-foreground text-left transition-colors"
              >
                Preços
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">Empresa</h3>
            <div className="flex flex-col space-y-2">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Sobre
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Blog
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Contato
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">Suporte</h3>
            <div className="flex flex-col space-y-2">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Central de Ajuda
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Documentação
              </a>
              <button 
                onClick={() => navigate("/auth")} 
                className="text-muted-foreground hover:text-foreground text-left transition-colors"
              >
                Login
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">Redes Sociais</h3>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Plataforma de Gestão para Agências. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacidade
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Termos
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                LGPD
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
