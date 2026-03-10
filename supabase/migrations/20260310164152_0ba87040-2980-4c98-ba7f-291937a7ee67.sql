-- Allow TI to delete tickets
CREATE POLICY "TI can delete tickets" ON public.tickets FOR DELETE TO public USING (public.is_ti());