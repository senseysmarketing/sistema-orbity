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

  // Calculate arrow path from modal to target
  const modalPosition = { bottom: 24, right: 24 }; // Fixed bottom-right position
  const modalCenter = {
    x: window.innerWidth - modalPosition.right - 192, // 192 = half of w-96 (384px)
    y: window.innerHeight - modalPosition.bottom - 120 // Approximate modal height
  };
  
  const targetCenter = {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2
  };

  return (
    <>
      {/* Overlay com efeito de spotlight */}
      <div className="fixed inset-0 z-[9998] animate-fade-in" onClick={skipTour}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      </div>
      
      {/* Spotlight effect - destaque no elemento alvo */}
      <div
        className="fixed z-[9999] pointer-events-none rounded-lg"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          boxShadow: '0 0 0 4px hsl(var(--primary)), 0 0 60px 20px hsl(var(--primary) / 0.4), 0 0 0 9999px rgba(0, 0, 0, 0.3)',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}
      />

      <style>{`
        ${currentStepData.target} {
          position: relative;
          z-index: 10000 !important;
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 60px 20px hsl(var(--primary) / 0.4), 0 0 0 9999px rgba(0, 0, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 0 6px hsl(var(--primary)), 0 0 80px 30px hsl(var(--primary) / 0.6), 0 0 0 9999px rgba(0, 0, 0, 0.3);
          }
        }
        
        @keyframes draw-line {
          0% {
            stroke-dashoffset: 1000;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>

      {/* Linha conectando modal ao elemento alvo */}
      <svg
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill="hsl(var(--primary))"
            />
          </marker>
        </defs>
        <path
          d={`M ${modalCenter.x} ${modalCenter.y} Q ${(modalCenter.x + targetCenter.x) / 2} ${(modalCenter.y + targetCenter.y) / 2 - 50}, ${targetCenter.x} ${targetCenter.y}`}
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          fill="none"
          strokeDasharray="10,5"
          markerEnd="url(#arrowhead)"
          style={{
            filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6))',
            animation: 'draw-line 1s ease-out forwards',
            strokeDasharray: '1000',
            strokeDashoffset: '1000'
          }}
        />
      </svg>

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
