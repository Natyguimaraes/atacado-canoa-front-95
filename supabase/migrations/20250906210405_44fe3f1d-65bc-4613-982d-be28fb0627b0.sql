-- Adicionar foreign key para melhorar performance das queries
-- Conectar orders com payments via order_id
ALTER TABLE payments ADD CONSTRAINT fk_payments_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id);

-- Criar índice para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);