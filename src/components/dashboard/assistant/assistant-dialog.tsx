'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Loader2, SendHorizonal, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { askAssistant, AssistantInput } from '@/ai/flows';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AssistantDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type Message = {
  role: 'user' | 'model';
  content: string;
};

export function AssistantDialog({ isOpen, onOpenChange }: AssistantDialogProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Assalomu alaykum! Men RashExam Tahlilchisi bo'yicha sizning yordamchingizman. Ilovadan foydalanish bo'yicha qanday savolingiz bor?",
    },
  ]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to the bottom whenever a new message is added
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);


  const handleSend = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: query };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setQuery('');
    setIsLoading(true);

    try {
      const assistantInput: AssistantInput = {
        query: query,
        history: messages,
      };

      const result = await askAssistant(assistantInput);
      
      const modelMessage: Message = { role: 'model', content: result.response };
      setMessages([...newMessages, modelMessage]);

    } catch (error) {
        console.error("Assistant error:", error);
        toast({
            variant: 'destructive',
            title: "Assistentda xatolik",
            description: "Javob olishda kutilmagan xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring."
        })
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Yordamchi</DialogTitle>
          <DialogDescription>
            Ilovadan foydalanish bo'yicha savollaringizni bering.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow h-0" ref={scrollAreaRef}>
          <div className="space-y-4 pr-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 text-sm',
                  message.role === 'user' ? 'justify-end' : ''
                )}
              >
                {message.role === 'model' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Bot size={20} />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-lg p-3 max-w-[80%]',
                    message.role === 'model'
                      ? 'bg-secondary'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  <p style={{whiteSpace: 'pre-wrap'}}>{message.content}</p>
                </div>
                 {message.role === 'user' && (
                   <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
                 <div className="flex items-start gap-3 text-sm">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Bot size={20} />
                    </div>
                    <div className="rounded-lg p-3 max-w-[80%] bg-secondary flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span>Yozmoqda...</span>
                    </div>
                 </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4">
          <div className="flex w-full items-center space-x-2">
            <Input
              id="assistant-query"
              placeholder="Savolingizni shu yerga yozing..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
            />
            <Button type="button" size="icon" onClick={handleSend} disabled={isLoading || !query.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              <span className="sr-only">Yuborish</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
