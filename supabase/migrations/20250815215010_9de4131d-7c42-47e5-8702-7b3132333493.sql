-- Create orders table for managing customer orders
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_id text,
  payment_method text NOT NULL,
  shipping_data jsonb NOT NULL,
  items jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all orders" 
ON public.orders 
FOR SELECT 
USING (auth.email() = 'admin@atacadocanoa.com');

CREATE POLICY "Admin can update all orders" 
ON public.orders 
FOR UPDATE 
USING (auth.email() = 'admin@atacadocanoa.com');

-- Add trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();