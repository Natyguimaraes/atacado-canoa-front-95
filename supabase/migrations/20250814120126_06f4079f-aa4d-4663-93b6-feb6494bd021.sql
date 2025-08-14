-- Insert specific admin and client users data
-- First, let's create some example profiles if they don't exist
INSERT INTO public.profiles (user_id, full_name, email, phone) 
VALUES 
  (gen_random_uuid(), 'Administrador Sistema', 'admin@atacadocanoa.com', '(75) 99712-9454'),
  (gen_random_uuid(), 'Cliente Exemplo', 'cliente@example.com', '(75) 99999-9999')
ON CONFLICT (user_id) DO NOTHING;

-- Insert example products with specific data
INSERT INTO public.products (name, description, category, price, original_price, sizes, colors, images, is_featured, is_new, is_active)
VALUES 
  ('Conjunto Bebê Premium', 'Conjunto completo para bebê com body, calça e babador em algodão 100%', 'bebe', 45.90, 59.90, ARRAY['RN', 'P', 'M'], ARRAY['azul', 'rosa', 'branco'], ARRAY['/assets/baby-clothes.jpg'], true, true, true),
  ('Vestido Infantil Floral', 'Vestido em algodão com estampa floral delicada, ideal para o verão', 'infantil', 32.50, NULL, ARRAY['2', '4', '6', '8', '10'], ARRAY['rosa', 'azul', 'amarelo'], ARRAY['/assets/kids-clothes.jpg'], true, false, true),
  ('Camiseta Adulto Premium', 'Camiseta em algodão pima com acabamento especial', 'adulto', 19.90, 29.90, ARRAY['P', 'M', 'G', 'GG'], ARRAY['branco', 'preto', 'cinza', 'azul'], ARRAY['/assets/adult-clothes.jpg'], false, false, true),
  ('Macacão Bebê Unissex', 'Macacão confortável para bebê em malha suave', 'bebe', 28.90, NULL, ARRAY['RN', 'P', 'M'], ARRAY['verde', 'amarelo', 'branco'], ARRAY['/assets/baby-clothes.jpg'], true, true, true)
ON CONFLICT (id) DO NOTHING;