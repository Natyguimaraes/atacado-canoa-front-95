-- Criar uma política mais flexível para administradores
-- Primeiro, vamos remover a política de admin atual e criar uma nova
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;

-- Criar nova política que permite admin baseado no email do usuário autenticado
CREATE POLICY "Admin can manage products" 
ON public.products 
FOR ALL 
USING (
  auth.email() = 'admin@atacadocanoa.com'
);

-- Atualizar também a função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin_by_email(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_email = 'admin@atacadocanoa.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;