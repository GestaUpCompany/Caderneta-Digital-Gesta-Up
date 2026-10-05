-- EXCECAO DE PROCESSO (aprovada pelo usuario em 2026-09-28):
-- migration criada no repo do PWA. O fluxo oficial e criar no repo do
-- Painel Web e aplicar via `supabase db push`. Esta migration sera
-- copiada para o Painel junto das demais; a versao ja foi registrada
-- em schema_migrations para o db push reconhece-la como aplicada.
--
-- Evidencia do problema: foto (Storage fotos-registros) + GPS, no
-- mesmo padrao das demais cadernetas com foto.
ALTER TABLE public.registros_problemas
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS gps_accuracy double precision;
