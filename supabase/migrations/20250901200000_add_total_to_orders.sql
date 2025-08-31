-- Adiciona a coluna 'total' à tabela de pedidos
ALTER TABLE public.orders
ADD COLUMN total numeric(10, 2) NOT NULL DEFAULT 0;

-- Adiciona um comentário para explicar para que serve a coluna (boa prática)
COMMENT ON COLUMN public.orders.total IS 'O valor total do pedido, calculado no momento da criação.';