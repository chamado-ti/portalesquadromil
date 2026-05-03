
-- Bucket dedicado para arquivos do TI (uploads reais em Arquivos & Notas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ti-files', 'ti-files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas: somente TI pode ler/escrever
DROP POLICY IF EXISTS "TI can read ti-files" ON storage.objects;
CREATE POLICY "TI can read ti-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'ti-files' AND public.is_ti());

DROP POLICY IF EXISTS "TI can upload ti-files" ON storage.objects;
CREATE POLICY "TI can upload ti-files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ti-files' AND public.is_ti());

DROP POLICY IF EXISTS "TI can update ti-files" ON storage.objects;
CREATE POLICY "TI can update ti-files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ti-files' AND public.is_ti());

DROP POLICY IF EXISTS "TI can delete ti-files" ON storage.objects;
CREATE POLICY "TI can delete ti-files"
ON storage.objects FOR DELETE
USING (bucket_id = 'ti-files' AND public.is_ti());
