import { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import { isWeekend, isBefore, startOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function rawPhone(formatted: string): string {
  return "55" + formatted.replace(/\D/g, "");
}

interface DemoSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

export function DemoSchedulingModal({ open, onOpenChange }: DemoSchedulingModalProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const today = startOfDay(new Date());

  const availableHours = useMemo(() => {
    if (!selectedDate) return ALL_HOURS;
    const now = new Date();
    const isToday = startOfDay(selectedDate).getTime() === startOfDay(now).getTime();
    if (!isToday) return ALL_HOURS;
    const currentHour = now.getHours();
    return ALL_HOURS.filter(h => h > currentHour);
  }, [selectedDate]);

  const isStep1Valid = name.trim() && agencyName.trim() && email.trim() && phone.replace(/\D/g, "").length >= 10;
  const isStep2Valid = selectedDate && selectedHour !== null;

  const goToStep2 = () => { setDirection(1); setStep(2); };
  const goBackToStep1 = () => { setDirection(-1); setStep(1); };

  const handleSubmit = async () => {
    if (!selectedDate || selectedHour === null) return;
    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(selectedHour, 0, 0, 0);

      await supabase.from('orbity_leads').insert({
        name: name.trim(),
        email: email.trim(),
        whatsapp: rawPhone(phone),
        phone: rawPhone(phone),
        agency_name: agencyName.trim(),
        scheduled_at: scheduledAt.toISOString(),
        lead_source: 'scheduling',
        status: 'reuniao_agendada',
      } as any);

      setDirection(1);
      setStep(3);
    } catch (error) {
      console.error('Error submitting scheduling:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setTimeout(() => {
        setStep(1);
        setDirection(1);
        setName("");
        setAgencyName("");
        setEmail("");
        setPhone("");
        setSelectedDate(undefined);
        setSelectedHour(null);
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0">
        <div className="px-6 pb-6 pt-6 min-h-[420px] flex flex-col">
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
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold">Agendar Apresentação</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Preencha seus dados para agendar uma demonstração personalizada
                </p>
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="sched-name">Nome Completo</Label>
                    <Input id="sched-name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sched-agency">Nome da Agência</Label>
                    <Input id="sched-agency" placeholder="Sua agência" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sched-email">E-mail</Label>
                    <Input id="sched-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sched-phone">Telefone</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground shrink-0">+55</div>
                      <Input
                        id="sched-phone"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                        maxLength={15}
                      />
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-6 bg-[#1c102f] hover:bg-[#1c102f]/90 text-white" disabled={!isStep1Valid} onClick={goToStep2}>
                  Escolher Data e Horário <ArrowRight className="ml-2 h-4 w-4" />
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
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold">Escolha o Melhor Horário</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione uma data e horário disponível
                </p>

                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedHour(null);
                      }}
                      disabled={(date) => isBefore(date, today) || isWeekend(date)}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto rounded-md border")}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {selectedDate ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        {availableHours.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4">
                            Sem horários disponíveis para hoje. Selecione outro dia.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {availableHours.map((hour) => (
                              <Button
                                key={hour}
                                variant={selectedHour === hour ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "text-sm",
                                  selectedHour === hour && "bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
                                )}
                                onClick={() => setSelectedHour(hour)}
                              >
                                {`${hour.toString().padStart(2, "0")}:00`}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4">
                        Selecione uma data no calendário
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={goBackToStep1}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
                    disabled={!isStep2Valid || isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Agendando...</>
                    ) : (
                      <>Confirmar Agendamento</>
                    )}
                  </Button>
                </div>
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
                className="flex-1 flex flex-col items-center justify-center text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Apresentação Agendada!</h3>
                <p className="text-muted-foreground max-w-sm">
                  Nosso time entrará em contato via WhatsApp para confirmar os detalhes da sua demonstração.
                </p>
                {selectedDate && selectedHour !== null && (
                  <div className="mt-4 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium">
                      📅 {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedHour?.toString().padStart(2, "0")}:00
                    </p>
                  </div>
                )}
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
