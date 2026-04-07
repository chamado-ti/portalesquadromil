
-- Add api_key column to ai_agents
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS api_key text DEFAULT NULL;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS api_provider text DEFAULT 'lovable' NOT NULL;

-- Kanban boards system
CREATE TABLE public.kanban_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  allowed_sectors text[] DEFAULT '{}',
  allowed_users uuid[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid,
  priority text DEFAULT 'medium',
  due_date date,
  sort_order integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TI Files module
CREATE TABLE public.ti_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  file_type text DEFAULT 'document',
  content text,
  file_url text,
  folder text DEFAULT 'Geral',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Processes module
CREATE TABLE public.processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'active',
  version integer DEFAULT 1,
  steps jsonb DEFAULT '[]',
  created_by uuid NOT NULL,
  allowed_viewers uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Risk assessments
CREATE TABLE public.risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  risk_level text DEFAULT 'medium',
  category text,
  status text DEFAULT 'identified',
  mitigation text,
  ai_analysis jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit items
CREATE TABLE public.audit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  title text NOT NULL,
  checklist jsonb DEFAULT '[]',
  evidence_urls text[] DEFAULT '{}',
  status text DEFAULT 'pending',
  notes text,
  auditor_id uuid,
  report_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for kanban_boards
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage all boards" ON public.kanban_boards FOR ALL USING (is_ti());
CREATE POLICY "Users can view accessible boards" ON public.kanban_boards FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    created_by = auth.uid() OR
    auth.uid() = ANY(allowed_users) OR
    is_ti() OR
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.sector = ANY(kanban_boards.allowed_sectors)
    )
  )
);

-- RLS for kanban_columns
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with board access can manage columns" ON public.kanban_columns FOR ALL USING (
  EXISTS (SELECT 1 FROM public.kanban_boards b WHERE b.id = board_id AND (
    b.created_by = auth.uid() OR auth.uid() = ANY(b.allowed_users) OR is_ti() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.sector = ANY(b.allowed_sectors))
  ))
);

-- RLS for kanban_cards
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with board access can manage cards" ON public.kanban_cards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.kanban_boards b WHERE b.id = board_id AND (
    b.created_by = auth.uid() OR auth.uid() = ANY(b.allowed_users) OR is_ti() OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.sector = ANY(b.allowed_sectors))
  ))
);

-- RLS for ti_files
ALTER TABLE public.ti_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage files" ON public.ti_files FOR ALL USING (is_ti());

-- RLS for processes
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage processes" ON public.processes FOR ALL USING (is_ti());
CREATE POLICY "Users can view allowed processes" ON public.processes FOR SELECT USING (
  auth.uid() IS NOT NULL AND (auth.uid() = ANY(allowed_viewers) OR is_ti())
);

-- RLS for risk_assessments
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage risks" ON public.risk_assessments FOR ALL USING (is_ti());

-- RLS for audit_items
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TI can manage audits" ON public.audit_items FOR ALL USING (is_ti());
