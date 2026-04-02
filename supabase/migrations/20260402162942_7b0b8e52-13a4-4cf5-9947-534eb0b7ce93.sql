
-- AI Agents table
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  memory_enabled BOOLEAN NOT NULL DEFAULT true,
  db_access_level TEXT NOT NULL DEFAULT 'none',
  db_tables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Agent access control
CREATE TABLE public.ai_agent_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL, -- 'user' or 'sector'
  target_value TEXT NOT NULL, -- user_id or sector name
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Agent conversations (per user per agent)
CREATE TABLE public.ai_agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova Conversa',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Module control
CREATE TABLE public.module_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key TEXT NOT NULL UNIQUE,
  module_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  allowed_roles TEXT[] DEFAULT '{}',
  allowed_users UUID[] DEFAULT '{}',
  allowed_sectors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kanban tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  assigned_to UUID,
  created_by UUID NOT NULL,
  sector TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task comments
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for ai_agents
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage agents" ON public.ai_agents FOR ALL USING (public.is_ti());
CREATE POLICY "Authenticated can read active agents" ON public.ai_agents FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- RLS for ai_agent_access
ALTER TABLE public.ai_agent_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage agent access" ON public.ai_agent_access FOR ALL USING (public.is_ti());
CREATE POLICY "Authenticated can read agent access" ON public.ai_agent_access FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS for ai_agent_conversations
ALTER TABLE public.ai_agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent conversations" ON public.ai_agent_conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "TI can view all agent conversations" ON public.ai_agent_conversations FOR SELECT USING (public.is_ti());

-- RLS for module_settings
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage modules" ON public.module_settings FOR ALL USING (public.is_ti());
CREATE POLICY "Authenticated can read modules" ON public.module_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage all tasks" ON public.tasks FOR ALL USING (public.is_ti());
CREATE POLICY "Users can view assigned tasks" ON public.tasks FOR SELECT USING (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- RLS for task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view task comments" ON public.task_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_comments.task_id AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid() OR public.is_ti()))
);
CREATE POLICY "Users can add task comments" ON public.task_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "TI can manage task comments" ON public.task_comments FOR ALL USING (public.is_ti());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_conversations;

-- Insert default modules
INSERT INTO public.module_settings (module_key, module_name, description, is_active, allowed_roles) VALUES
  ('ai_agents', 'Agentes IA', 'Assistentes IA personalizados', false, '{"ti","colaborador","guarita"}'),
  ('tasks', 'Tarefas', 'Sistema de tarefas estilo Kanban', false, '{"ti","colaborador"}'),
  ('reports', 'Relatórios', 'Relatórios e análises', true, '{"ti"}'),
  ('appointments', 'Agendamentos', 'Gestão de agendamentos de visitantes', true, '{"ti","colaborador","guarita"}'),
  ('tickets', 'Chamados', 'Sistema de chamados TI', true, '{"ti","colaborador"}');
