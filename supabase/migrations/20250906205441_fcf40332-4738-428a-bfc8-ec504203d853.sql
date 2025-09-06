-- Verificar e corrigir as restrições da tabela payments
-- Primeiro, vamos ver quais restrições existem
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'payments'::regclass 
AND contype = 'c';

-- Remover a restrição antiga se existir
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- Criar nova restrição que aceita os status do Mercado Pago
ALTER TABLE payments 
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('PENDING', 'IN_PROCESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'CHARGED_BACK', 'AUTHORIZED', 'PAID', 'EXPIRED', 'FAILED'));