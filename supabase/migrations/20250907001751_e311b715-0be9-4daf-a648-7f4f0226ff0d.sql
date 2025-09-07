-- Criar usuário administrador atacadocanoa@gmail.com
-- Primeiro, vamos inserir o usuário diretamente na tabela auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'atacadocanoa@gmail.com',
  crypt('Admin@2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Criar perfil para o usuário
INSERT INTO public.profiles (user_id, full_name, email)
SELECT id, 'Administrador Atacado Canoa', 'atacadocanoa@gmail.com'
FROM auth.users 
WHERE email = 'atacadocanoa@gmail.com';

-- Adicionar role de admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'atacadocanoa@gmail.com';

-- Atualizar as políticas que verificam admin por email para incluir o novo email
-- Atualizar função que verifica admin por email
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

-- Atualizar políticas que usam verificação por email específico
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