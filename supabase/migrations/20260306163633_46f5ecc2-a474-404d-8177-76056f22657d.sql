
-- Add vehicle_plate column to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS vehicle_plate text;

-- Insert "Resolvido pelo colaborador" status if not exists
INSERT INTO public.ticket_statuses (name, color, sort_order)
SELECT 'Resolvido pelo colaborador', 'green', 5
WHERE NOT EXISTS (SELECT 1 FROM public.ticket_statuses WHERE name = 'Resolvido pelo colaborador');

-- Create ticket-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to ticket-attachments
CREATE POLICY "Authenticated can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');
