-- Allow TI to delete ticket messages (needed for deleting tickets)
CREATE POLICY "TI can delete ticket messages" ON public.ticket_messages FOR DELETE TO public USING (public.is_ti());