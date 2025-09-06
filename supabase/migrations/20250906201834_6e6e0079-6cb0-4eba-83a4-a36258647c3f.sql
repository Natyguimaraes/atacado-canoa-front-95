-- Add missing user_id column to payment_idempotency table
ALTER TABLE payment_idempotency 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);