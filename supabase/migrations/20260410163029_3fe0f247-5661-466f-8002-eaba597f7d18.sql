
-- Fix: Allow TI to delete any AI conversation (not just their own)
CREATE POLICY "TI can delete all conversations" ON public.ai_conversations
FOR DELETE USING (is_ti());

-- Also allow TI to view all conversations
CREATE POLICY "TI can view all conversations" ON public.ai_conversations
FOR SELECT USING (is_ti());
