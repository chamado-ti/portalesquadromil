
-- Create sectors table for TI to manage
CREATE TABLE IF NOT EXISTS public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sectors" ON public.sectors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "TI can manage sectors" ON public.sectors FOR ALL USING (is_ti());

-- Allow TI to delete appointments  
CREATE POLICY "TI can delete all appointments" ON public.appointments FOR DELETE USING (is_ti());
