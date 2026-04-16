import { useNavigate } from "react-router-dom";
import { Instagram, Linkedin } from "lucide-react";
import orbityLogo from "@/assets/orbity-logo.png";

export function LandingFooter() {
  const navigate = useNavigate();

  const scrollTo = (hash: string) => {
    navigate("/lp");
    setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Coluna 1 — Marca */}
        <div className="space-y-4">
          <img src={orbityLogo} alt="Orbity" className="h-8" />
          <p className="text-sm text-slate-500 mt-4">
            O padrão operacional das agências de elite.
          </p>
          <div className="flex gap-4 mt-4">
            <a href="#" className="text-slate-400 hover:text-purple-600 transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-slate-400 hover:text-purple-600 transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Coluna 2 — Produto */}
        <div>
          <h4 className="font-semibold text-slate-900 mb-4">Produto</h4>
          <ul className="space-y-3">
            <li><button onClick={() => scrollTo("#features")} className="text-slate-600 hover:text-slate-900 transition-colors">Funcionalidades</button></li>
            <li><button onClick={() => scrollTo("#integrations")} className="text-slate-600 hover:text-slate-900 transition-colors">Integrações</button></li>
            <li><button onClick={() => scrollTo("#pricing")} className="text-slate-600 hover:text-slate-900 transition-colors">Preços</button></li>
            <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Atualizações</a></li>
          </ul>
        </div>

        {/* Coluna 3 — Empresa */}
        <div>
          <h4 className="font-semibold text-slate-900 mb-4">Empresa</h4>
          <ul className="space-y-3">
            <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Sobre nós</a></li>
            <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Contato</a></li>
            <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Programa de Parceiros</a></li>
          </ul>
        </div>

        {/* Coluna 4 — Legal */}
        <div>
          <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
          <ul className="space-y-3">
            <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Termos de Uso</a></li>
            <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Política de Privacidade</a></li>
            <li><a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Central de Ajuda</a></li>
          </ul>
        </div>
      </div>

      {/* Barra de Compliance */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <span>© 2026 Orbity (by Senseys). Todos os direitos reservados.</span>
          <span>CNPJ: 51.912.584/0001-02</span>
          <span>Desenvolvido com tecnologia de ponta no Brasil.</span>
        </div>
      </div>
    </footer>
  );
}
