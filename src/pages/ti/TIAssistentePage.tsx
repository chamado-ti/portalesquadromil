import { useState, useRef, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIConversations } from '@/hooks/useAIConversations';
import { Bot, Send, Trash2, User, Plus, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; }

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export default function TIAssistentePage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { conversations, createConversation, updateConversation, deleteConversation } = useAIConversations();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadConversation = useCallback((conv: typeof conversations[0]) => {
    setActiveConversationId(conv.id);
    const loaded: ChatMsg[] = (conv.messages as any[]).map((m: any) => ({
      id: m.id || crypto.randomUUID(), role: m.role, content: m.content, timestamp: new Date(m.timestamp || Date.now()),
    }));
    setMessages(loaded);
  }, []);

  const saveConversation = useCallback(async () => {
    if (!activeConversationId || messages.length === 0) return;
    const title = messages[0]?.content?.slice(0, 50) || 'Nova Conversa';
    await updateConversation({
      id: activeConversationId,
      messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content, timestamp: m.timestamp.toISOString() })) as any,
      title,
    });
  }, [activeConversationId, messages, updateConversation]);

  useEffect(() => {
    if (messages.length > 0 && activeConversationId && !isLoading) {
      const timer = setTimeout(saveConversation, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, activeConversationId, isLoading, saveConversation]);

  const handleNewChat = async () => {
    const conv = await createConversation('Nova Conversa');
    setActiveConversationId(conv.id);
    setMessages([]);
  };

  const handleDeleteConv = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) { setActiveConversationId(null); setMessages([]); }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!activeConversationId) {
      const conv = await createConversation(inputValue.slice(0, 50));
      setActiveConversationId(conv.id);
    }
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', content: inputValue.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const resp = await fetch(STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ messages: apiMessages, tiMode: true }),
      });

      if (!resp.ok) throw new Error('Erro ao conectar com a IA');
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.id === assistantId) return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { id: assistantId, role: 'assistant', content: assistantSoFar, timestamp: new Date() }];
              });
            }
          } catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: err.message || 'Erro ao processar.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar */}
        <div className="hidden w-72 flex-shrink-0 flex-col rounded-xl border bg-card md:flex">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="text-sm font-semibold">Conversas</h3>
            <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {conversations.map(conv => (
                <div key={conv.id} className={cn('group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent', activeConversationId === conv.id && 'bg-accent')} onClick={() => loadConversation(conv)}>
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); handleDeleteConv(conv.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {conversations.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma conversa</p>}
            </div>
          </ScrollArea>
        </div>

        {/* Chat */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5"><Bot className="h-5 w-5 text-primary" /></div>
              <span className="font-semibold">Assistente IA — Painel TI</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="md:hidden" onClick={handleNewChat}><Plus className="h-4 w-4" /></Button>
              {messages.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setActiveConversationId(null); }}><Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar</Button>}
            </div>
          </div>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-2xl bg-primary/10 p-5"><Bot className="h-12 w-12 text-primary" /></div>
                <h3 className="mb-2 text-lg font-semibold">Assistente TI com Dados do Sistema</h3>
                <p className="max-w-md text-muted-foreground">Acesse informações sobre chamados, usuários, agendamentos e mais.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {['Quantos chamados abertos?', 'Resumo dos tickets urgentes', 'Usuários inativos'].map(q => (
                    <Button key={q} variant="outline" size="sm" onClick={() => setInputValue(q)}>{q}</Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[80%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      )}
                      <p className={`mt-1 text-xs ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {format(msg.timestamp, "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted"><Bot className="h-4 w-4" /></div>
                    <div className="rounded-xl bg-muted p-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input placeholder="Pergunte sobre o sistema..." value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }} disabled={isLoading} className="flex-1" />
              <Button onClick={sendMessage} disabled={isLoading || !inputValue.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
