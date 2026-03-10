import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Trash2, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; }

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export default function TIAssistentePage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
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
      <div className="animate-fade-in flex h-[calc(100vh-8rem)] flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden border-none shadow-sm">
          <CardHeader className="flex-shrink-0 border-b bg-card">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5"><Bot className="h-5 w-5 text-primary" /></div>
                Assistente IA — Painel TI
              </CardTitle>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setMessages([])}><Trash2 className="mr-2 h-4 w-4" /> Limpar</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-2xl bg-primary/10 p-5"><Bot className="h-12 w-12 text-primary" /></div>
                  <h3 className="mb-2 text-lg font-semibold">Assistente TI com Dados do Sistema</h3>
                  <p className="max-w-md text-muted-foreground">
                    Acesse informações sobre chamados, usuários, agendamentos e mais. Pergunte sobre o que precisar.
                  </p>
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
                  {isLoading && (
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
            <div className="flex-shrink-0 border-t p-4">
              <div className="flex gap-2">
                <Input placeholder="Pergunte sobre o sistema..." value={inputValue} onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }} disabled={isLoading} className="flex-1" />
                <Button onClick={sendMessage} disabled={isLoading || !inputValue.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}