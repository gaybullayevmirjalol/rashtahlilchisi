'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { AssistantDialog } from './assistant-dialog';

export function AssistantButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <AssistantDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsDialogOpen(true)}
      >
        <MessageSquare className="h-7 w-7" />
        <span className="sr-only">Yordamchi bilan suhbat</span>
      </Button>
    </>
  );
}
