
-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create user_credentials table for storing service credentials
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_email text NOT NULL,
  service_password text NOT NULL,
  service_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TI can manage credentials" ON public.user_credentials
  FOR ALL TO public USING (public.is_ti());

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "TI can upload avatars" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'avatars' AND public.is_ti());

CREATE POLICY "TI can update avatars" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'avatars' AND public.is_ti());

CREATE POLICY "TI can delete avatars" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'avatars' AND public.is_ti());

-- Create kb-files storage bucket for knowledge base file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('kb-files', 'kb-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view kb files" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'kb-files');

CREATE POLICY "TI can upload kb files" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'kb-files' AND public.is_ti());

CREATE POLICY "TI can delete kb files" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'kb-files' AND public.is_ti());
