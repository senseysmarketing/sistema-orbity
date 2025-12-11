import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/auth" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Login
          </Link>
        </Button>

        <div className="bg-card rounded-lg border border-border p-8 space-y-8">
          <div className="text-center border-b border-border pb-6">
            <h1 className="text-3xl font-bold text-foreground">Política de Privacidade</h1>
            <p className="text-muted-foreground mt-2">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Senseys - Digital Performance ("nós", "nosso" ou "Senseys") opera o aplicativo Orbity ("Serviço"). 
              Esta página informa sobre nossas políticas relativas à coleta, uso e divulgação de informações pessoais 
              quando você usa nosso Serviço.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Informações que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Coletamos diferentes tipos de informações para fornecer e melhorar nosso Serviço:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Dados de Conta:</strong> Nome, endereço de e-mail, senha (criptografada)</li>
              <li><strong>Dados de Uso:</strong> Informações sobre como você acessa e usa o Serviço</li>
              <li><strong>Dados de Clientes:</strong> Informações de clientes que você adiciona à plataforma</li>
              <li><strong>Dados de Integração:</strong> Tokens de acesso para integrações autorizadas (Google Calendar, Facebook Ads)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Uso de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos os dados coletados para:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Fornecer e manter nosso Serviço</li>
              <li>Notificar você sobre alterações em nosso Serviço</li>
              <li>Permitir participação em recursos interativos</li>
              <li>Fornecer suporte ao cliente</li>
              <li>Monitorar o uso do Serviço para melhorias</li>
              <li>Detectar, prevenir e resolver problemas técnicos</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Integrações de Terceiros</h2>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-foreground">4.1 Google Calendar</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Nossa integração com Google Calendar permite sincronizar reuniões entre o Orbity e seu calendário Google. 
                Solicitamos os seguintes escopos:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">calendar.events</code> - Para criar, editar e excluir eventos de reunião</li>
                <li><code className="bg-muted px-1 rounded">calendar.readonly</code> - Para ler calendários e importar eventos existentes</li>
                <li><code className="bg-muted px-1 rounded">userinfo.email</code> - Para identificar a conta conectada</li>
              </ul>
              <p className="text-muted-foreground text-sm">
                Acessamos apenas eventos criados através do Orbity e eventos que você explicitamente escolhe importar.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-foreground">4.2 Facebook / Meta</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Nossa integração com Facebook permite gerenciar contas de anúncios e capturar leads. 
                Solicitamos os seguintes escopos:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">ads_management</code> e <code className="bg-muted px-1 rounded">ads_read</code> - Para visualizar métricas de campanhas</li>
                <li><code className="bg-muted px-1 rounded">leads_retrieval</code> - Para capturar leads de formulários</li>
                <li><code className="bg-muted px-1 rounded">pages_read_engagement</code> - Para acessar páginas e formulários de lead</li>
              </ul>
              <p className="text-muted-foreground text-sm">
                Operamos em modo somente leitura para métricas de anúncios e acessamos apenas dados autorizados.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              A segurança dos seus dados é importante para nós. Utilizamos medidas de segurança padrão da indústria, 
              incluindo:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Criptografia de senhas com algoritmos seguros</li>
              <li>Tokens de acesso armazenados de forma segura</li>
              <li>Controle de acesso baseado em funções (Row Level Security)</li>
              <li>Infraestrutura hospedada em provedores certificados (Supabase)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Retemos seus dados pessoais apenas pelo tempo necessário para os fins estabelecidos nesta política. 
              Quando você solicita a exclusão de sua conta, removemos seus dados pessoais dentro de 30 dias, 
              exceto quando obrigados por lei a retê-los.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar consentimento a qualquer momento</li>
              <li>Solicitar portabilidade dos dados</li>
              <li>Desconectar integrações de terceiros</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar nossa Política de Privacidade periodicamente. Notificaremos você sobre quaisquer 
              alterações publicando a nova política nesta página e atualizando a data de "última atualização".
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>E-mail: <a href="mailto:contato@senseys.com.br" className="text-primary hover:underline">contato@senseys.com.br</a></li>
              <li>Website: <a href="https://senseys.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">senseys.com.br</a></li>
            </ul>
          </section>

          <div className="border-t border-border pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Senseys - Digital Performance. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
