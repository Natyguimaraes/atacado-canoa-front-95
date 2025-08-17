-- Verificar e atualizar a tabela carts para funcionar corretamente
-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Adicionar trigger na tabela carts se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_carts_updated_at'
    ) THEN
        CREATE TRIGGER update_carts_updated_at
            BEFORE UPDATE ON public.carts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;