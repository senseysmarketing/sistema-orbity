import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Mic, MicOff, Keyboard, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AIPreFillStepProps {
  type: "task" | "post";
  onResult: (data: any) => void;
  onSkip: () => void;
  loading: boolean;
  onSubmit: (text: string) => void;
}

export function AIPreFillStep({ type, onResult, onSkip, loading, onSubmit }: AIPreFillStepProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
        setText((prev) => prev + final);
      }
      setInterimText(interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText("");
  }, []);

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };

  const placeholder =
    type === "task"
      ? "Ex: Preciso criar uma landing page para o cliente X com foco em conversão, prazo para sexta-feira, prioridade alta..."
      : "Ex: Criar um post para o Instagram do cliente Y sobre a promoção de verão, com carrossel de 5 slides e hashtags relevantes...";

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Preenchimento Inteligente</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Descreva {type === "task" ? "a tarefa" : "o post"} em suas palavras e vamos preencher os campos
          automaticamente.
        </p>
      </div>

      <Tabs defaultValue="type" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="type" className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Digitar
          </TabsTrigger>
          {speechSupported && (
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <AudioLines className="h-4 w-4" />
              Gravar Áudio
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="type" className="mt-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={5}
            className="resize-none"
          />
        </TabsContent>

        {speechSupported && (
          <TabsContent value="audio" className="mt-4">
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                className={`h-20 w-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
              <p className="text-sm text-muted-foreground">
                {isRecording ? "Gravando... Clique para parar" : "Clique para começar a gravar"}
              </p>
              {(text || interimText) && (
                <div className="w-full rounded-md border bg-muted/50 p-3 text-sm max-h-32 overflow-y-auto">
                  {text}
                  {interimText && <span className="text-muted-foreground italic">{interimText}</span>}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex flex-col items-center gap-3 w-full">
        <Button onClick={handleSubmit} disabled={!text.trim() || loading} className="w-full gap-2">
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Preencher com IA
            </>
          )}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Pular e preencher manualmente
        </button>
      </div>
    </div>
  );
}
