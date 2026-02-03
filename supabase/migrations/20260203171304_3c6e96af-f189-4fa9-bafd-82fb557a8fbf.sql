-- Fix security warnings: update permissive RLS policies

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create more restrictive policies for audit_logs
-- Only allow inserts from service role or through triggers (no direct client inserts)
CREATE POLICY "TI can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (public.is_ti());

-- For notifications, allow authenticated users to create notifications for specific purposes
CREATE POLICY "Authenticated can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            public.is_ti() OR 
            public.is_guarita() OR 
            user_id = auth.uid()
        )
    );

-- Fix function search_path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;