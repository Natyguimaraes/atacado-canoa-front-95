-- Adiciona a coluna de estoque à tabela de produtos
ALTER TABLE public.products
ADD COLUMN stock integer NOT NULL DEFAULT 0;

-- Cria uma função para diminuir o estoque de forma segura
CREATE OR REPLACE FUNCTION public.decrease_stock(product_id_to_update uuid, quantity_to_decrease int)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - quantity_to_decrease
  WHERE id = product_id_to_update AND stock >= quantity_to_decrease;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;