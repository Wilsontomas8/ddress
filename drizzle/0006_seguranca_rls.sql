-- Segurança por linha (RLS) em todas as tabelas do esquema public.
--
-- O Supabase publica o esquema public na sua API REST: sem RLS, quem tivesse
-- a chave pública do projecto podia ler contas, pedidos e clientes. Com RLS
-- ligado e sem políticas, essa API não vê nada. O site não é afectado: liga
-- como dono das tabelas, que não é travado pelo RLS.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
