import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useProductTour } from '@/hooks/useProductTour';

export function TourTooltip() {
  const { isActive, currentStep, totalSteps, currentStepData, nextStep, prevStep, skipTour } = useProductTour();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0, rotation: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStepData.target);
      if (!targetElement || !tooltipRef.current) return;

      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const placement = currentStepData.placement || 'bottom';
      
      let top = 0;
      let left = 0;
      let arrowTop = 0;
      let arrowLeft = 0;
      let arrowRotation = 0;

      switch (placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 24;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          // Seta apontando para baixo
          arrowTop = targetRect.top - 20;
          arrowLeft = targetRect.left + targetRect.width / 2;
          arrowRotation = 180;
          break;
        case 'bottom':
          top = targetRect.bottom + 24;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          // Seta apontando para cima
          arrowTop = targetRect.bottom + 8;
          arrowLeft = targetRect.left + targetRect.width / 2;
          arrowRotation = 0;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - 24;
          // Seta apontando para direita
          arrowTop = targetRect.top + targetRect.height / 2;
          arrowLeft = targetRect.left - 20;
          arrowRotation = 90;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + 24;
          // Seta apontando para esquerda
          arrowTop = targetRect.top + targetRect.height / 2;
          arrowLeft = targetRect.right + 8;
          arrowRotation = -90;
          break;
      }

      // Keep tooltip in viewport
      const padding = 16;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

      setPosition({ top, left });
      setArrowPosition({ top: arrowTop, left: arrowLeft, rotation: arrowRotation });

      // Scroll target into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStepData]);

  if (!isActive || !currentStepData) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9998] animate-fade-in" onClick={skipTour} />
      
      {/* Spotlight effect on target */}
      <style>{`
        ${currentStepData.target} {
          position: relative;
          z-index: 9999 !important;
          box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 40px 8px hsl(var(--primary) / 0.3) !important;
          border-radius: 8px;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 40px 8px hsl(var(--primary) / 0.3);
          }
          50% {
            box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 60px 12px hsl(var(--primary) / 0.5);
          }
        }
        
        @keyframes bounce-arrow {
          0%, 100% {
            transform: translateY(0) rotate(var(--arrow-rotation));
          }
          50% {
            transform: translateY(-8px) rotate(var(--arrow-rotation));
          }
        }
      `}</style>

      {/* Seta animada apontando para o elemento */}
      <div 
        className="fixed z-[9999] pointer-events-none"
        style={{ 
          top: `${arrowPosition.top}px`, 
          left: `${arrowPosition.left}px`,
          '--arrow-rotation': `${arrowPosition.rotation}deg`
        } as React.CSSProperties}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          className="text-primary drop-shadow-lg"
          style={{
            animation: 'bounce-arrow 1.5s ease-in-out infinite',
            transformOrigin: 'center',
            transform: `translateX(-50%) translateY(-50%) rotate(${arrowPosition.rotation}deg)`
          }}
        >
          <path
            d="M12 5L12 19M12 19L5 12M12 19L19 12"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Tooltip */}
      <Card 
        ref={tooltipRef}
        className="fixed z-[10000] w-96 shadow-2xl border-2 border-primary/20 animate-scale-in"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
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
