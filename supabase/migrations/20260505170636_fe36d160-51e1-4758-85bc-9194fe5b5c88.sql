
-- 1. Add tracked_password column to profiles (TI-only visibility via existing RLS)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tracked_password text;

-- 2. Add appointment_type to support "simple" appointments (no QR code)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'visit';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- 3. Add ticket resolution fields (TI-only via RLS)
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolution_type text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS resolution_notes text;

-- 4. Expand Guarita: allow Guarita to create and view tickets like a colaborador
CREATE POLICY "Guarita can view own tickets"
  ON public.tickets FOR SELECT
  USING (is_guarita() AND (created_by = auth.uid() OR assigned_to = auth.uid()));

-- 5. Realtime: ensure tickets, ticket_messages, notifications, appointments stream changes
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
