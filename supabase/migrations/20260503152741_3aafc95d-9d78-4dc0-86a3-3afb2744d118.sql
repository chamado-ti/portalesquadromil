-- 1. Enable realtime for groups tables
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.group_tags REPLICA IDENTITY FULL;
ALTER TABLE public.group_tag_members REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='group_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='group_tags') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.group_tags';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='group_tag_members') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.group_tag_members';
  END IF;
END $$;

-- 2. Add reply support and reaction storage
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.group_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON public.group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_reply ON public.group_messages(reply_to_id);

-- 3. Track last-read per user/group for unread counts
CREATE TABLE IF NOT EXISTS public.group_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
ALTER TABLE public.group_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads" ON public.group_reads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. Storage bucket for group attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-attachments', 'group-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Group attachments readable by authenticated"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'group-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can upload group attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'group-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own group attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'group-attachments' AND (owner = auth.uid() OR public.is_ti()));
