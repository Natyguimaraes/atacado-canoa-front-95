-- Criar tabela de avaliações de produtos
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);

-- Garantir que um usuário só pode avaliar um produto uma vez
CREATE UNIQUE INDEX unique_user_product_review ON public.product_reviews(product_id, user_id);

-- Habilitar RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Qualquer um pode ver as avaliações
CREATE POLICY "Anyone can view reviews" 
ON public.product_reviews 
FOR SELECT 
USING (true);

-- Usuários logados podem criar avaliações
CREATE POLICY "Authenticated users can create reviews" 
ON public.product_reviews 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias avaliações
CREATE POLICY "Users can update their own reviews" 
ON public.product_reviews 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar suas próprias avaliações
CREATE POLICY "Users can delete their own reviews" 
ON public.product_reviews 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Admins podem gerenciar todas as avaliações
CREATE POLICY "Admins can manage all reviews" 
ON public.product_reviews 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();