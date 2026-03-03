import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  ticketSuggestion?: {
    titulo: string;
    descricao: string;
    categoria: string;
  };
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const parseTicketSuggestion = (content: string) => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.sugerir_chamado) {
          return {
            titulo: parsed.titulo,
            descricao: parsed.descricao,
            categoria: parsed.categoria,
          };
        }
      } catch (e) {
        console.error('Error parsing ticket suggestion:', e);
      }
    }
    return undefined;
  };

  const cleanMessageContent = (content: string) => {
    return content.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
  };

  const autoCreateTicket = useCallback(async (suggestion: ChatMessage['ticketSuggestion']) => {
    if (!suggestion) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          messages: [{ role: 'user', content: 'Criar chamado automaticamente' }],
          autoCreateTicket: suggestion 
        },
      });
      
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['colaborador-tickets'] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      }
    } catch (err) {
      console.error('Error auto-creating ticket:', err);
    }
  }, [queryClient]);

  const sendMessage = useCallback(async (userMessage: string) => {
    const userChatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userChatMessage]);
    setIsLoading(true);

    try {
      const messagesForAPI = [...messages, userChatMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: messagesForAPI },
      });

      if (error) throw error;

      const ticketSuggestion = parseTicketSuggestion(data.message);
      const cleanContent = cleanMessageContent(data.message);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: cleanContent,
        timestamp: new Date(),
        ticketSuggestion,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    autoCreateTicket,
  };
}
