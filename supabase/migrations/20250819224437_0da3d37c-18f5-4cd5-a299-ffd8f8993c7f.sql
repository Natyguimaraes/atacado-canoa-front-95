-- Adicionar produtos realistas ao catálogo

INSERT INTO public.products (
  name, description, price, original_price, category, sizes, colors, images, is_new, is_featured, is_active
) VALUES 
-- Roupas Femininas
('Camiseta Feminina Básica', 'Camiseta 100% algodão, corte reto, ideal para o dia a dia', 29.90, 39.90, 'adulto', ARRAY['P', 'M', 'G', 'GG'], ARRAY['Branco', 'Preto', 'Rosa', 'Azul'], ARRAY['/assets/camiseta-feminina-branca.jpg'], true, false, true),

('Vestido Preto Elegante', 'Vestido midi em tecido premium, decote em V, perfeito para ocasiões especiais', 89.90, 120.00, 'adulto', ARRAY['P', 'M', 'G', 'GG'], ARRAY['Preto', 'Azul Marinho'], ARRAY['/assets/vestido-preto-elegante.jpg'], false, true, true),

('Calça Jeans Skinny Feminina', 'Calça jeans com elastano, modelagem skinny, cintura alta', 79.90, null, 'adulto', ARRAY['36', '38', '40', '42', '44'], ARRAY['Azul Escuro', 'Azul Claro'], ARRAY[], false, false, true),

-- Roupas Masculinas  
('Calça Jeans Masculina', 'Calça jeans tradicional, corte reto, algodão premium', 69.90, 89.90, 'adulto', ARRAY['38', '40', '42', '44', '46'], ARRAY['Azul Escuro', 'Azul Médio', 'Preto'], ARRAY['/assets/calca-jeans-masculina.jpg'], false, true, true),

('Moletom Masculino', 'Moletom com capuz, felpa interna, bolso canguru', 59.90, 79.90, 'adulto', ARRAY['P', 'M', 'G', 'GG', 'XGG'], ARRAY['Preto', 'Cinza', 'Azul Marinho'], ARRAY['/assets/moletom-preto.jpg'], true, false, true),

('Jaqueta Jeans Masculina', 'Jaqueta jeans clássica, gola esporte, bolsos frontais', 99.90, null, 'adulto', ARRAY['P', 'M', 'G', 'GG'], ARRAY['Azul Escuro', 'Azul Desbotado'], ARRAY['/assets/jaqueta-jeans-masculina.jpg'], false, true, true),

('Camisa Social Masculina', 'Camisa social algodão premium, corte slim, colarinho italiano', 49.90, 69.90, 'adulto', ARRAY['P', 'M', 'G', 'GG'], ARRAY['Branco', 'Azul Claro', 'Preto'], ARRAY[], false, false, true),

-- Roupas Infantis
('Vestido Infantil Vermelho', 'Vestido floral com saia rodada, tecido algodão, muito confortável', 39.90, 49.90, 'infantil', ARRAY['2', '4', '6', '8', '10'], ARRAY['Vermelho', 'Rosa', 'Azul'], ARRAY['/assets/vestido-infantil-vermelho.jpg'], true, true, true),

('Camiseta Listrada Infantil', 'Camiseta manga curta com listras coloridas, 100% algodão', 24.90, null, 'infantil', ARRAY['2', '4', '6', '8', '10', '12'], ARRAY['Azul/Branco', 'Rosa/Branco', 'Verde/Branco'], ARRAY['/assets/camiseta-listrada-infantil.jpg'], false, false, true),

('Pijama Unicórnio', 'Pijama temático com estampa de unicórnio, tecido macio e confortável', 34.90, 44.90, 'infantil', ARRAY['2', '4', '6', '8'], ARRAY['Rosa', 'Lilás'], ARRAY['/assets/pijama-unicornio-rosa.jpg'], true, true, true),

('Bermuda Jeans Infantil', 'Bermuda jeans com elastano, bolsos funcionais, barra desfiada', 29.90, null, 'infantil', ARRAY['2', '4', '6', '8', '10'], ARRAY['Azul Claro', 'Azul Escuro'], ARRAY[], false, false, true),

-- Roupas de Bebê
('Macacão Bebê Azul', 'Macacão de algodão com botões na frente, ideal para recém-nascidos', 32.90, 42.90, 'bebe', ARRAY['RN', 'P', 'M', 'G'], ARRAY['Azul', 'Rosa', 'Amarelo'], ARRAY['/assets/macacao-bebe-azul.jpg'], true, true, true),

('Vestido Bebê Rosa com Renda', 'Vestido delicado com detalhes em renda, perfeito para ocasiões especiais', 45.90, null, 'bebe', ARRAY['RN', 'P', 'M'], ARRAY['Rosa', 'Branco'], ARRAY['/assets/vestido-bebe-rosa-renda.jpg'], false, true, true),

('Body Bebê Manga Longa', 'Body em algodão premium, manga longa, abertura em botões', 19.90, 24.90, 'bebe', ARRAY['RN', 'P', 'M', 'G'], ARRAY['Branco', 'Rosa', 'Azul', 'Amarelo'], ARRAY[], true, false, true),

('Conjunto Bebê 3 Peças', 'Conjunto completo: body, calça e casaquinho, algodão orgânico', 59.90, 79.90, 'bebe', ARRAY['RN', 'P', 'M'], ARRAY['Rosa/Branco', 'Azul/Branco'], ARRAY[], false, true, true),

('Sapatinho Bebê Tricot', 'Sapatinho em tricot macio, solado antiderrapante, muito confortável', 15.90, null, 'bebe', ARRAY['14', '15', '16', '17'], ARRAY['Rosa', 'Azul', 'Branco', 'Amarelo'], ARRAY[], true, false, true);