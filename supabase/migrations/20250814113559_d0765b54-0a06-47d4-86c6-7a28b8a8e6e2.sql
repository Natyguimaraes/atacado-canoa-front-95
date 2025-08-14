-- Inserir um usuário administrador padrão
-- Primeiro, vamos inserir um profile de admin direto
INSERT INTO public.profiles (id, user_id, full_name, email) VALUES 
(gen_random_uuid(), gen_random_uuid(), 'Administrador', 'admin@atacadocanoa.com')
ON CONFLICT (user_id) DO NOTHING;

-- E adicionar o papel de admin para este perfil
INSERT INTO public.user_roles (user_id, role) 
SELECT user_id, 'admin' FROM public.profiles 
WHERE email = 'admin@atacadocanoa.com'
ON CONFLICT (user_id, role) DO NOTHING;