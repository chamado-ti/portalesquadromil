import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useAIAssistant, ChatMessage, FileAttachment } from '@/hooks/useAIAssistant';

export default function TIAssistentePage() {
  const { messages, isLoading, sendMessage, clearMessages, setMessages } = useAIAssistant();
  const { conversations, createConversation, updateConversation, deleteConversation, refetch } = useAIConversations();
  const [inputValue, setInputValue] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const loadConversation = useCallback((conv: typeof conversations[0]) => {
    setActiveConversationId(conv.id);
    const loaded: ChatMessage[] = (conv.messages as any[]).map((m: any) => ({
      id: m.id || crypto.randomUUID(), role: m.role, content: m.content,
      timestamp: new Date(m.timestamp || Date.now()), attachments: m.attachments,
    }));
    setMessages(loaded);
  }, [setMessages]);

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
    clearMessages();
  };

  const handleDeleteConv = async (id: string) => {
    try {
      // Clear UI immediately if deleting active conversation
      if (activeConversationId === id) {
        setActiveConversationId(null);
        clearMessages();
      }
      await deleteConversation(id);
      // Force refetch to ensure clean state
      await refetch();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleSend = async (attachments?: FileAttachment[]) => {
    if (!inputValue.trim() && (!attachments || attachments.length === 0)) return;
    if (!activeConversationId) {
      const conv = await createConversation(inputValue.slice(0, 50) || 'Arquivo');
      setActiveConversationId(conv.id);
    }
    const msg = inputValue;
    setInputValue('');
    await sendMessage(msg, attachments, true);
  };

  return (
    <DashboardLayout>
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        onNewChat={handleNewChat}
        onClear={async () => {
          // Se há uma conversa ativa, persiste mensagens vazias para apagar do DB
          if (activeConversationId) {
            try { await updateConversation({ id: activeConversationId, messages: [] }); } catch {}
          }
          clearMessages();
          setActiveConversationId(null);
          await refetch();
        }}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={loadConversation}
        onDeleteConversation={handleDeleteConv}
        title="Assistente IA — Painel TI"
        subtitle="Acesse informações sobre chamados, usuários, agendamentos e mais. Envie imagens, PDFs e áudios."
        quickPrompts={['Quantos chamados abertos?', 'Resumo dos tickets urgentes', 'Usuários inativos']}
      />
    </DashboardLayout>
  );
}
