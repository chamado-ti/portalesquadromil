import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAIAssistant, ChatMessage, FileAttachment } from '@/hooks/useAIAssistant';

interface Agent {
  id: string; name: string; description: string | null; system_prompt: string;
  model: string; memory_enabled: boolean; is_active: boolean;
}

interface AgentConv {
  id: string; agent_id: string; user_id: string; title: string; messages: any[]; updated_at: string | null;
}

export default function ColaboradorAgentesPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { messages, isLoading, sendMessage, clearMessages, setMessages } = useAIAssistant();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Fetch agents I have access to
  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['my-agents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: allAgents, error: e1 } = await supabase.from('ai_agents').select('*').eq('is_active', true);
      if (e1) throw e1;
      const { data: access, error: e2 } = await supabase.from('ai_agent_access').select('*');
      if (e2) throw e2;
      // Filter agents I have access to
      return (allAgents || []).filter(agent => {
        return access?.some(a =>
          a.agent_id === agent.id && (
            (a.access_type === 'user' && a.target_value === user.id) ||
            (a.access_type === 'sector' && a.target_value === (profile as any)?.sector)
          )
        );
      }) as Agent[];
    },
    enabled: !!user?.id,
  });

  // Fetch conversations for selected agent
  const { data: conversations = [] } = useQuery({
    queryKey: ['agent-conversations', selectedAgent?.id, user?.id],
    queryFn: async () => {
      if (!selectedAgent?.id || !user?.id) return [];
      const { data, error } = await supabase.from('ai_agent_conversations')
        .select('*').eq('agent_id', selectedAgent.id).eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => ({ ...c, messages: (c.messages as any[]) || [] })) as AgentConv[];
    },
    enabled: !!selectedAgent?.id && !!user?.id,
  });

  const loadConversation = useCallback((conv: AgentConv) => {
    setActiveConvId(conv.id);
    setMessages((conv.messages as any[]).map((m: any) => ({
      id: m.id || crypto.randomUUID(), role: m.role, content: m.content,
      timestamp: new Date(m.timestamp || Date.now()),
    })));
  }, [setMessages]);

  const saveConv = useCallback(async () => {
    if (!activeConvId || messages.length === 0) return;
    await supabase.from('ai_agent_conversations').update({
      messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content, timestamp: m.timestamp.toISOString() })) as any,
      title: messages[0]?.content?.slice(0, 50) || 'Nova Conversa',
    }).eq('id', activeConvId);
  }, [activeConvId, messages]);

  useEffect(() => {
    if (messages.length > 0 && activeConvId && !isLoading) {
      const t = setTimeout(saveConv, 1000);
      return () => clearTimeout(t);
    }
  }, [messages, activeConvId, isLoading, saveConv]);

  const handleNewChat = async () => {
    if (!selectedAgent || !user) return;
    const { data, error } = await supabase.from('ai_agent_conversations').insert({
      agent_id: selectedAgent.id, user_id: user.id, title: 'Nova Conversa', messages: [],
    }).select().single();
    if (!error && data) { setActiveConvId(data.id); clearMessages(); }
    queryClient.invalidateQueries({ queryKey: ['agent-conversations'] });
  };

  const handleDeleteConv = async (id: string) => {
    await supabase.from('ai_agent_conversations').delete().eq('id', id);
    if (activeConvId === id) { setActiveConvId(null); clearMessages(); }
    queryClient.invalidateQueries({ queryKey: ['agent-conversations'] });
  };

  const handleSend = async (attachments?: FileAttachment[]) => {
    if (!inputValue.trim() && (!attachments || attachments.length === 0)) return;
    if (!activeConvId && selectedAgent && user) {
      const { data } = await supabase.from('ai_agent_conversations').insert({
        agent_id: selectedAgent.id, user_id: user.id, title: inputValue.slice(0, 50) || 'Conversa', messages: [],
      }).select().single();
      if (data) setActiveConvId(data.id);
      queryClient.invalidateQueries({ queryKey: ['agent-conversations'] });
    }
    const msg = inputValue; setInputValue('');
    // Use custom system prompt via the agent
    await sendMessage(msg, attachments);
  };

  if (!selectedAgent) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Meus Agentes IA</h2>
            <p className="text-muted-foreground">Assistentes IA disponíveis para você</p>
          </div>
          {loadingAgents ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : agents.length === 0 ? (
            <Card className="py-12 text-center">
              <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum agente disponível para você</p>
              <p className="mt-1 text-xs text-muted-foreground">Peça ao TI para liberar um agente</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map(agent => (
                <Card key={agent.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedAgent(agent); clearMessages(); setActiveConvId(null); }}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2"><Bot className="h-5 w-5 text-primary" /></div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <CardDescription>{agent.description || 'Assistente IA'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedAgent(null); clearMessages(); setActiveConvId(null); }}>
          <ArrowLeft className="mr-2 h-4 w-4" />Voltar
        </Button>
        <ChatInterface
          messages={messages} isLoading={isLoading} inputValue={inputValue}
          onInputChange={setInputValue} onSend={handleSend} onNewChat={handleNewChat}
          onClear={() => { clearMessages(); setActiveConvId(null); }}
          conversations={conversations} activeConversationId={activeConvId}
          onSelectConversation={loadConversation} onDeleteConversation={handleDeleteConv}
          title={selectedAgent.name} subtitle={selectedAgent.description || 'Assistente IA personalizado'}
        />
      </div>
    </DashboardLayout>
  );
}
