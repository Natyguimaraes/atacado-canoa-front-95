-- Script para garantir que a tabela 'orders' tenha as colunas 'total_amount' e 'payment_method'.

-- Gerencia a coluna 'total_amount' de forma segura
DO $$
BEGIN
   -- Caso 1: A coluna 'total' existe, mas 'total_amount' não. Renomeia 'total' para 'total_amount'.
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total') AND
      NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total_amount') THEN
      
      ALTER TABLE public.orders RENAME COLUMN total TO total_amount;
      
   -- Caso 2: A coluna 'total_amount' não existe de todo (e 'total' também não). Cria 'total_amount'.
   ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total_amount') THEN
      
      ALTER TABLE public.orders ADD COLUMN total_amount numeric(10, 2);
      
   END IF;
END $$;


-- Gerencia a coluna 'payment_method'
DO $$
BEGIN
   -- Adiciona a coluna 'payment_method' apenas se ela não existir.
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_method') THEN
      ALTER TABLE public.orders ADD COLUMN payment_method TEXT;
   END IF;
END $$;

-- Garante que os comentários estão atualizados (boa prática)
COMMENT ON COLUMN public.orders.total_amount IS 'O valor total do pedido.';
COMMENT ON COLUMN public.orders.payment_method IS 'Método de pagamento escolhido (ex: PIX, CARD).';