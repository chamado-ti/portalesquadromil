-- Tabela para armazenar a logo customizada
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- RLS para system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TI can manage settings" ON public.system_settings
FOR ALL USING (public.is_ti());

CREATE POLICY "Authenticated can read settings" ON public.system_settings
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tabela para armazenar documentos de treinamento da IA
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS para ai_knowledge_base
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TI can manage knowledge base" ON public.ai_knowledge_base
FOR ALL USING (public.is_ti());

CREATE POLICY "Authenticated can read knowledge base" ON public.ai_knowledge_base
FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Tabela para armazenar histórico de conversas da IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova Conversa',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS para ai_conversations
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their conversations" ON public.ai_conversations
FOR ALL USING (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_ai_knowledge_base_updated_at
  BEFORE UPDATE ON public.ai_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Criar storage bucket para logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para storage bucket logos
CREATE POLICY "Public read logos" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "TI can upload logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'logos' AND public.is_ti());

CREATE POLICY "TI can update logos" ON storage.objects
FOR UPDATE USING (bucket_id = 'logos' AND public.is_ti());

CREATE POLICY "TI can delete logos" ON storage.objects
FOR DELETE USING (bucket_id = 'logos' AND public.is_ti());