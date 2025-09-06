-- Fix RLS policy for payment_idempotency table to allow edge functions to insert
CREATE POLICY "Edge functions can insert idempotency records" 
ON public.payment_idempotency 
FOR INSERT 
WITH CHECK (true);

-- Allow edge functions to update payment_idempotency records
CREATE POLICY "Edge functions can update idempotency records" 
ON public.payment_idempotency 
FOR UPDATE 
USING (true);