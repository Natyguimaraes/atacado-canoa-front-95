-- Insert example products with specific data for demonstration
INSERT INTO public.products (name, description, category, price, original_price, sizes, colors, images, is_featured, is_new, is_active)
VALUES 
  ('Conjunto Bebê Premium', 'Conjunto completo para bebê com body, calça e babador em algodão 100%', 'bebe', 45.90, 59.90, ARRAY['RN', 'P', 'M'], ARRAY['azul', 'rosa', 'branco'], ARRAY['/assets/baby-clothes.jpg'], true, true, true),
  ('Vestido Infantil Floral', 'Vestido em algodão com estampa floral delicada, ideal para o verão', 'infantil', 32.50, NULL, ARRAY['2', '4', '6', '8', '10'], ARRAY['rosa', 'azul', 'amarelo'], ARRAY['/assets/kids-clothes.jpg'], true, false, true),
  ('Camiseta Adulto Premium', 'Camiseta em algodão pima com acabamento especial', 'adulto', 19.90, 29.90, ARRAY['P', 'M', 'G', 'GG'], ARRAY['branco', 'preto', 'cinza', 'azul'], ARRAY['/assets/adult-clothes.jpg'], false, false, true),
  ('Macacão Bebê Unissex', 'Macacão confortável para bebê em malha suave', 'bebe', 28.90, NULL, ARRAY['RN', 'P', 'M'], ARRAY['verde', 'amarelo', 'branco'], ARRAY['/assets/baby-clothes.jpg'], true, true, true),
  ('Blusa Feminina Elegante', 'Blusa social feminina em tecido leve e confortável', 'adulto', 34.90, 49.90, ARRAY['P', 'M', 'G', 'GG'], ARRAY['branco', 'azul', 'preto'], ARRAY['/assets/adult-clothes.jpg'], true, false, true),
  ('Short Infantil Colorido', 'Short em sarja com estampa divertida para crianças', 'infantil', 18.90, NULL, ARRAY['4', '6', '8', '10', '12'], ARRAY['azul', 'verde', 'vermelho'], ARRAY['/assets/kids-clothes.jpg'], false, true, true)
ON CONFLICT (id) DO NOTHING;