-- Allow guarita to create appointments (for walk-ins)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Guarita can create appointments' AND tablename = 'appointments') THEN
    CREATE POLICY "Guarita can create appointments" ON public.appointments FOR INSERT TO public WITH CHECK (public.is_guarita());
  END IF;
END $$;

-- Fix notifications insert policy
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);