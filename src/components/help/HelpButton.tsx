import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { HelpCenter } from './HelpCenter';

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
        aria-label="Abrir central de ajuda"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>

      <HelpCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
