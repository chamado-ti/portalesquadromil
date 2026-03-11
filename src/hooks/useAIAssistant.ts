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

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export function useAIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const parseTicketSuggestion = (content: string) => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.sugerir_chamado) return { titulo: parsed.titulo, descricao: parsed.descricao, categoria: parsed.categoria };
      } catch {}
    }
    return undefined;
  };

  const cleanMessageContent = (content: string) => content.replace(/```json\s*[\s\S]*?\s*```/, '').trim();

  const autoCreateTicket = useCallback(async (suggestion: ChatMessage['ticketSuggestion']) => {
    if (!suggestion) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await fetch(STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Criar chamado automaticamente' }], autoCreateTicket: suggestion }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.message || 'Chamado criado com sucesso!', timestamp: new Date() }]);
        queryClient.invalidateQueries({ queryKey: ['colaborador-tickets'] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      }
    } catch (err) { console.error('Error auto-creating ticket:', err); }
  }, [queryClient]);

  const sendMessage = useCallback(async (userMessage: string) => {
    const userChatMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userChatMessage]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const messagesForAPI = [...messages, userChatMessage].map(m => ({ role: m.role, content: m.content }));
      const resp = await fetch(STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ messages: messagesForAPI }),
      });

      if (!resp.ok) { const errData = await resp.json().catch(() => ({})); throw new Error(errData.error || 'Erro ao conectar com a IA'); }
      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantSoFar = '';
      let textBuffer = '';
      const assistantId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.id === assistantId) return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { id: assistantId, role: 'assistant' as const, content: assistantSoFar, timestamp: new Date() }];
              });
            }
          } catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try { const parsed = JSON.parse(jsonStr); const content = parsed.choices?.[0]?.delta?.content; if (content) assistantSoFar += content; } catch {}
        }
      }

      const ticketSuggestion = parseTicketSuggestion(assistantSoFar);
      const cleanContent = cleanMessageContent(assistantSoFar);
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleanContent || assistantSoFar, ticketSuggestion } : m));
    } catch (error: any) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: error.message || 'Erro ao processar.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages, autoCreateTicket, setMessages };
}
