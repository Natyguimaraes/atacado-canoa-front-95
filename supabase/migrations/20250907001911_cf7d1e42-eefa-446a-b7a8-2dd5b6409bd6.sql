-- Atualizar função que verifica admin por email para incluir o novo email
CREATE OR REPLACE FUNCTION public.is_admin_by_email(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN user_email IN ('admin@atacadocanoa.com', 'atacadocanoa@gmail.com');
END;
$$;

-- Atualizar políticas que usam verificação por email específico para incluir o novo admin
DROP POLICY IF EXISTS "Admin can view all orders" ON public.orders;
CREATE POLICY "Admin can view all orders" 
ON public.orders 
FOR SELECT 
USING (auth.email() IN ('admin@atacadocanoa.com', 'atacadocanoa@gmail.com'));

DROP POLICY IF EXISTS "Admin can update all orders" ON public.orders;
CREATE POLICY "Admin can update all orders" 
ON public.orders 
FOR UPDATE 
USING (auth.email() IN ('admin@atacadocanoa.com', 'atacadocanoa@gmail.com'));

DROP POLICY IF EXISTS "Admin can view all payments" ON public.payments;
CREATE POLICY "Admin can view all payments" 
ON public.payments 
FOR SELECT 
USING (auth.email() IN ('admin@atacadocanoa.com', 'atacadocanoa@gmail.com'));

DROP POLICY IF EXISTS "Admin can update all payments" ON public.payments;
CREATE POLICY "Admin can update all payments" 
ON public.payments 
FOR UPDATE 
USING (auth.email() IN ('admin@atacadocanoa.com', 'atacadocanoa@gmail.com'));

DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
CREATE POLICY "Admin can manage products" 
ON public.products 
FOR ALL 
USING (auth.email() IN ('admin@atacadocanoa.com', 'atacadocanoa@gmail.com'));