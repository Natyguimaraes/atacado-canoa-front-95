-- Adiciona a coluna 'shipping_data' à tabela de pedidos, apenas se ela não existir.
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_data') THEN
      -- A coluna é do tipo JSONB para armazenar o objeto com os dados de entrega
      ALTER TABLE public.orders ADD COLUMN shipping_data jsonb;
   END IF;
END $$;

-- Adiciona um comentário para documentação (boa prática)
COMMENT ON COLUMN public.orders.shipping_data IS 'Armazena os dados de entrega do cliente em formato JSON.';