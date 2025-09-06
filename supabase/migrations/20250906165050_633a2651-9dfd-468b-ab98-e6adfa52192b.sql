-- Criar tabela para controle de idempotência
CREATE TABLE IF NOT EXISTS public.payment_idempotency (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  payment_id uuid REFERENCES public.payments(id),
  external_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.payment_idempotency ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_idempotency
CREATE POLICY "Users can view their own idempotency records" 
ON public.payment_idempotency 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.payments 
  WHERE payments.id = payment_idempotency.payment_id 
  AND payments.user_id = auth.uid()
));

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_payment_idempotency_key ON public.payment_idempotency(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency_expires ON public.payment_idempotency(expires_at);

-- Adicionar campos para melhor auditoria e segurança
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS idempotency_key text,
ADD COLUMN IF NOT EXISTS request_ip inet,
ADD COLUMN IF NOT EXISTS user_agent text;

-- Índice único para evitar pagamentos duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key 
ON public.payments(idempotency_key) 
WHERE idempotency_key IS NOT NULL;