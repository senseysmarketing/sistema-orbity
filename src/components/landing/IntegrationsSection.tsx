import { Shield, Lock, Eye } from "lucide-react";

export function IntegrationsSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Integrações Nativas & Seguras
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Conecte suas ferramentas favoritas com total segurança e transparência
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Meta Integration */}
          <div className="bg-card border rounded-xl p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-600" fill="currentColor">
                  <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Meta Business Suite</h3>
                <p className="text-muted-foreground">Facebook & Instagram Ads</p>
              </div>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Dashboard unificado de todas as contas de anúncios
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Captura automática de leads do Facebook Lead Ads
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Alertas de saldo baixo em contas de anúncios
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Métricas de campanhas em tempo real
              </li>
            </ul>
          </div>

          {/* Google Calendar Integration */}
          <div className="bg-card border rounded-xl p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" className="stroke-green-600" strokeWidth="2"/>
                  <path d="M3 10h18" className="stroke-green-600" strokeWidth="2"/>
                  <path d="M9 2v4M15 2v4" className="stroke-green-600" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="7" y="14" width="4" height="4" rx="0.5" className="fill-blue-500"/>
                  <rect x="13" y="14" width="4" height="4" rx="0.5" className="fill-red-500"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Google Calendar</h3>
                <p className="text-muted-foreground">Sincronização Bidirecional</p>
              </div>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Sincronização automática de reuniões
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Criação automática de links do Google Meet
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Convites automáticos para participantes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Escolha qual calendário sincronizar
              </li>
            </ul>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-card/50 border rounded-2xl p-8 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-10 h-10 text-primary" />
              </div>
            </div>
            <div className="text-center md:text-left space-y-3">
              <h3 className="text-2xl font-bold">Compromisso com sua Privacidade</h3>
              <p className="text-muted-foreground text-lg">
                Utilizamos seus dados <strong className="text-foreground">exclusivamente</strong> para o funcionamento das integrações. 
                Não vendemos, compartilhamos ou utilizamos suas informações para fins publicitários ou qualquer outra finalidade.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4 text-primary" />
                  Dados criptografados
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4 text-primary" />
                  Sem rastreamento
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  LGPD Compliant
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}