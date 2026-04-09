import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle2, Sparkles } from "lucide-react";

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function rawPhone(formatted: string): string {
  return "55" + formatted.replace(/\D/g, "");
}

interface ApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

export function ApplicationModal({ open, onOpenChange }: ApplicationModalProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [activeClients, setActiveClients] = useState("");
  const [avgTicket, setAvgTicket] = useState("");

  const totalSteps = 4;

  const nextStep = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      nextStep();
    }, 2000);
  };

  const handleClose = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setTimeout(() => {
        setStep(1);
        setDirection(1);
      }, 300);
    }
  };

  const isStep1Valid = name.trim() && email.trim() && whatsapp.trim();
  const isStep2Valid = instagram.trim() && teamSize;
  const isStep3Valid = activeClients.trim() && avgTicket;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0">
        {step < 4 && (
          <div className="px-6 pt-6">
            <Progress value={(step / (totalSteps - 1)) * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-2">Passo {step} de 3</p>
          </div>
        )}

        <div className="px-6 pb-6 pt-4 min-h-[320px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="flex-1 flex flex-col"
              >
                <h3 className="text-xl font-bold mb-1">Vamos começar!</h3>
                <p className="text-sm text-muted-foreground mb-6">Preencha seus dados de contato</p>
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input id="whatsapp" placeholder="(00) 00000-0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full mt-6 bg-[#1c102f] hover:bg-[#1c102f]/90 text-white" disabled={!isStep1Valid} onClick={nextStep}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="flex-1 flex flex-col"
              >
                <h3 className="text-xl font-bold mb-1">Sobre sua agência</h3>
                <p className="text-sm text-muted-foreground mb-6">Nos conte sobre sua estrutura</p>
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram da Agência</Label>
                    <Input id="instagram" placeholder="@suaagencia" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tamanho da Equipe</Label>
                    <Select value={teamSize} onValueChange={setTeamSize}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">Sou sozinho (Eu-gência)</SelectItem>
                        <SelectItem value="2-5">2 a 5 pessoas</SelectItem>
                        <SelectItem value="6-15">6 a 15 pessoas</SelectItem>
                        <SelectItem value="15+">Mais de 15 pessoas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full mt-6 bg-[#1c102f] hover:bg-[#1c102f]/90 text-white" disabled={!isStep2Valid} onClick={nextStep}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="flex-1 flex flex-col"
              >
                <h3 className="text-xl font-bold mb-1">Faturamento e escala</h3>
                <p className="text-sm text-muted-foreground mb-6">Última etapa para entendermos sua operação</p>
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="clients">Quantos clientes ativos você tem hoje?</Label>
                    <Input id="clients" type="number" placeholder="Ex: 15" value={activeClients} onChange={(e) => setActiveClients(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ticket Médio mensal dos seus clientes</Label>
                    <Select value={avgTicket} onValueChange={setAvgTicket}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<1k">Menos de R$ 1.000</SelectItem>
                        <SelectItem value="1k-2.5k">R$ 1.000 a R$ 2.500</SelectItem>
                        <SelectItem value="2.5k-5k">R$ 2.500 a R$ 5.000</SelectItem>
                        <SelectItem value=">5k">Acima de R$ 5.000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full mt-6 bg-[#1c102f] hover:bg-[#1c102f]/90 text-white" disabled={!isStep3Valid || isSubmitting} onClick={handleSubmit}>
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <>Finalizar Aplicação <Sparkles className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Aplicação recebida!</h3>
                <p className="text-muted-foreground max-w-sm">
                  Nossa equipe de especialistas analisará seu perfil e entrará em contato via WhatsApp em breve.
                </p>
                <Button variant="outline" className="mt-8" onClick={() => handleClose(false)}>
                  Fechar
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
