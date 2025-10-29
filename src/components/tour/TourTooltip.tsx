import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useProductTour } from '@/hooks/useProductTour';

export function TourTooltip() {
  const { isActive, currentStep, totalSteps, currentStepData, nextStep, prevStep, skipTour } = useProductTour();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const updateTargetPosition = () => {
      const targetElement = document.querySelector(currentStepData.target);
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll target into view smoothly
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [isActive, currentStepData]);

  if (!isActive || !currentStepData || !targetRect) return null;

  return (
    <>
      {/* Overlay escuro sem blur */}
      <div className="fixed inset-0 bg-black/75 z-[9998] animate-fade-in" onClick={skipTour} />
      
      {/* Spotlight com cor de alto contraste */}
      <div
        className="fixed z-[9999] pointer-events-none rounded-lg"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          boxShadow: '0 0 0 3px hsl(var(--primary)), 0 0 0 6px hsl(var(--background)), 0 0 40px 15px hsl(var(--primary) / 0.8), 0 0 0 9999px rgba(0, 0, 0, 0.75)',
          animation: 'pulse-spotlight 2s ease-in-out infinite',
        }}
      />

      <style>{`
        ${currentStepData.target} {
          position: relative;
          z-index: 10000 !important;
        }
        
        @keyframes pulse-spotlight {
          0%, 100% {
            box-shadow: 0 0 0 3px hsl(var(--primary)), 0 0 0 6px hsl(var(--background)), 0 0 40px 15px hsl(var(--primary) / 0.8), 0 0 0 9999px rgba(0, 0, 0, 0.75);
          }
          50% {
            box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 0 8px hsl(var(--background)), 0 0 60px 25px hsl(var(--primary) / 0.9), 0 0 0 9999px rgba(0, 0, 0, 0.75);
          }
        }
      `}</style>

      {/* Modal fixo no canto inferior direito */}
      <Card 
        ref={tooltipRef}
        className="fixed bottom-6 right-6 z-[10000] w-96 shadow-2xl border-2 border-primary/30 animate-scale-in"
      >
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1 hover:bg-destructive/10 hover:text-destructive"
              onClick={skipTour}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStepData.content}
          </p>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Passo {currentStep + 1} de {totalSteps}</span>
              <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% completo</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={skipTour}
              className="text-xs"
            >
              Pular Tour
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                size="sm"
                onClick={nextStep}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    Concluir
                    <Sparkles className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
