
-- Add icon column to ai_agents
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS icon text DEFAULT 'bot';

-- Agent skills table
CREATE TABLE public.ai_agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parameters jsonb DEFAULT '{}',
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TI can manage agent skills" ON public.ai_agent_skills FOR ALL USING (is_ti());
CREATE POLICY "Authenticated can read skills" ON public.ai_agent_skills FOR SELECT USING (auth.uid() IS NOT NULL);

-- Agent-module connections
CREATE TABLE public.ai_agent_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, module_key)
);

ALTER TABLE public.ai_agent_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TI can manage agent modules" ON public.ai_agent_modules FOR ALL USING (is_ti());
CREATE POLICY "Authenticated can read agent modules" ON public.ai_agent_modules FOR SELECT USING (auth.uid() IS NOT NULL);
