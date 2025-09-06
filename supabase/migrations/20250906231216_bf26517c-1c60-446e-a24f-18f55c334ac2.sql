-- Verificar e corrigir o check constraint da tabela payments
-- Primeiro, vamos ver o constraint atual
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass AND contype = 'c';

-- Remover o constraint existente se necessário
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;

-- Adicionar um novo constraint que aceita os valores corretos
ALTER TABLE payments ADD CONSTRAINT payments_method_check 
CHECK (method IN ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CREDIT', 'CARD'));