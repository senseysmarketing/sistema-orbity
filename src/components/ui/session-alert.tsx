import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

interface SessionAlertProps {
  show: boolean;
  title: string;
  message: string;
  onRefresh: () => void;
  onDismiss: () => void;
  autoHide?: number; // Auto hide after X milliseconds
}

export function SessionAlert({ 
  show, 
  title, 
  message, 
  onRefresh, 
  onDismiss, 
  autoHide 
}: SessionAlertProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, autoHide);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 animate-in slide-in-from-top-2">
      <Alert className="bg-background border-warning shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold mb-1">{title}</h4>
            <AlertDescription className="text-sm">
              {message}
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Atualizar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
          >
            Mais tarde
          </Button>
        </div>
      </Alert>
    </div>
  );
}