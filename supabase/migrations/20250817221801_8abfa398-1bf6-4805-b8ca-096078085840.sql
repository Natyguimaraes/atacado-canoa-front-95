-- Fix unique constraint on carts table to prevent 409 conflicts
-- Remove existing constraint if it exists and add proper one
ALTER TABLE public.carts DROP CONSTRAINT IF EXISTS unique_user_cart;

-- Add unique constraint properly
ALTER TABLE public.carts ADD CONSTRAINT unique_user_cart UNIQUE (user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);