-- Limpar registros duplicados do carrinho, mantendo apenas o mais recente por usuário
DELETE FROM carts 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM carts 
  ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Adicionar constraint para evitar múltiplos carrinhos por usuário
ALTER TABLE carts ADD CONSTRAINT unique_user_cart UNIQUE (user_id);