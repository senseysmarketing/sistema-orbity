import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProductTour } from '@/hooks/useProductTour';

export function TourTooltip() {
  const { isActive, currentStep, totalSteps, currentStepData, nextStep, prevStep, skipTour } = useProductTour();
  const [position, setPosition] = useState({ top: 0, left: 0 });
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

      switch (placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 16;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + 16;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - 16;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + 16;
          break;
      }

      // Keep tooltip in viewport
      const padding = 16;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

      setPosition({ top, left });

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
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={skipTour} />
      
      {/* Spotlight effect on target */}
      <style>{`
        ${currentStepData.target} {
          position: relative;
          z-index: 9999 !important;
          box-shadow: 0 0 0 4px hsl(var(--primary)) !important;
          border-radius: 8px;
        }
      `}</style>

      {/* Tooltip */}
      <Card 
        ref={tooltipRef}
        className="fixed z-[10000] w-96 shadow-xl"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={skipTour}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {currentStepData.content}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} de {totalSteps}
            </span>
            
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
              >
                {currentStep === totalSteps - 1 ? 'Concluir' : 'Próximo'}
                {currentStep !== totalSteps - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
