-- Adicionar campo CPF na tabela profiles para dados reais de pagamento
ALTER TABLE public.profiles 
ADD COLUMN cpf TEXT;

-- Criar índice para performance
CREATE INDEX idx_profiles_cpf ON public.profiles(cpf);

-- Adicionar campo de endereço completo na tabela profiles para checkout
ALTER TABLE public.profiles 
ADD COLUMN address JSONB DEFAULT '{}'::jsonb;

-- Comentário para documentar o uso do campo address
COMMENT ON COLUMN public.profiles.address IS 'Armazena dados de endereço: {street, number, complement, neighborhood, city, state, zipCode}';