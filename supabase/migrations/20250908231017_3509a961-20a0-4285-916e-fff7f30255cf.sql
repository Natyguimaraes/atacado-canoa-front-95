-- Add wholesale and retail price columns to products table
ALTER TABLE public.products 
ADD COLUMN wholesale_price numeric,
ADD COLUMN retail_price numeric;

-- Update existing products to use retail_price as the current price
UPDATE public.products 
SET retail_price = price 
WHERE retail_price IS NULL;