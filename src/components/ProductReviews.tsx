import { useState, useEffect } from 'react';
import { Star, MessageSquare, ThumbsUp, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [productId, user]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      // Buscar todas as avaliações do produto
      const { data: reviewsData, error } = await supabase
        .from('product_reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          user_id
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar informações dos usuários separadamente
      const reviewsList = reviewsData || [];
      const userIds = [...new Set(reviewsList.map(review => review.user_id))];
      
      let userProfiles: any = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (profilesData) {
          userProfiles = profilesData.reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {} as any);
        }
      }

      // Combinar reviews com profiles
      const reviewsWithProfiles = reviewsList.map(review => ({
        ...review,
        profiles: userProfiles[review.user_id] || null
      }));

      setReviews(reviewsWithProfiles);
      setTotalReviews(reviewsWithProfiles.length);

      // Calcular média
      if (reviewsWithProfiles.length > 0) {
        const sum = reviewsWithProfiles.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(sum / reviewsWithProfiles.length);
      } else {
        setAverageRating(0);
      }

      // Verificar se o usuário já avaliou
      if (user) {
        const existingReview = reviewsWithProfiles.find(review => review.user_id === user.id);
        setUserReview(existingReview || null);
        
        if (existingReview) {
          setRating(existingReview.rating);
          setComment(existingReview.comment || '');
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar avaliações:', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !isAuthenticated) {
      toast.error('Faça login para avaliar este produto');
      return;
    }

    if (rating === 0) {
      toast.error('Selecione uma nota de 1 a 5 estrelas');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData = {
        product_id: productId,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      };

      if (userReview) {
        // Atualizar avaliação existente
        const { error } = await supabase
          .from('product_reviews')
          .update(reviewData)
          .eq('id', userReview.id);

        if (error) throw error;
        toast.success('Avaliação atualizada com sucesso!');
      } else {
        // Criar nova avaliação
        const { error } = await supabase
          .from('product_reviews')
          .insert(reviewData);

        if (error) throw error;
        toast.success('Avaliação enviada com sucesso!');
      }

      setShowReviewForm(false);
      fetchReviews(); // Recarregar avaliações
    } catch (error: any) {
      console.error('Erro ao enviar avaliação:', error);
      if (error.code === '23505') {
        toast.error('Você já avaliou este produto');
      } else {
        toast.error('Erro ao enviar avaliação. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;

      toast.success('Avaliação removida com sucesso!');
      setUserReview(null);
      setRating(0);
      setComment('');
      setShowReviewForm(false);
      fetchReviews();
    } catch (error: any) {
      console.error('Erro ao remover avaliação:', error);
      toast.error('Erro ao remover avaliação');
    }
  };

  const renderStars = (currentRating: number, interactive = false, size = 'sm') => {
    const starSize = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} cursor-pointer transition-colors ${
              star <= currentRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground hover:text-yellow-400'
            }`}
            onClick={interactive ? () => setRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card className="card-elegant">
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elegant">
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="text-lg sm:text-xl">Avaliações</span>
            {totalReviews > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
              </Badge>
            )}
          </div>
          
          {isAuthenticated && !showReviewForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewForm(true)}
              className="hover-scale w-full sm:w-auto"
            >
              {userReview ? 'Editar Avaliação' : 'Avaliar Produto'}
            </Button>
          )}
        </CardTitle>

        {/* Resumo das avaliações */}
        {totalReviews > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2">
            <div className="flex items-center gap-2">
              {renderStars(Math.round(averageRating), false, 'md')}
              <span className="font-bold text-lg">
                {averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-muted-foreground text-sm">
              Baseado em {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Formulário de avaliação */}
        {showReviewForm && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">
              {userReview ? 'Editar sua avaliação' : 'Deixe sua avaliação'}
            </h4>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Nota:</label>
              {renderStars(rating, true, 'lg')}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Comentário (opcional):</label>
              <Textarea
                placeholder="Conte sobre sua experiência com este produto..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground text-right">
                {comment.length}/500 caracteres
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting || rating === 0}
                className="btn-gradient hover-scale flex-1 sm:flex-none"
              >
                {isSubmitting ? 'Enviando...' : userReview ? 'Atualizar' : 'Enviar Avaliação'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowReviewForm(false);
                  if (userReview) {
                    setRating(userReview.rating);
                    setComment(userReview.comment || '');
                  } else {
                    setRating(0);
                    setComment('');
                  }
                }}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>

              {userReview && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteReview}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Remover
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Lista de avaliações */}
        {totalReviews === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Nenhuma avaliação ainda</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Seja o primeiro a avaliar este produto!
            </p>
            {isAuthenticated && !showReviewForm && (
              <Button
                onClick={() => setShowReviewForm(true)}
                className="btn-gradient hover-scale"
              >
                Deixar Avaliação
              </Button>
            )}
            {!isAuthenticated && (
              <Alert>
                <AlertDescription>
                  Faça login para avaliar este produto
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <div key={review.id}>
                 <div className="space-y-3">
                   <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                     <div className="space-y-2 flex-1">
                       <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                         <div className="flex items-center gap-2">
                           <User className="h-4 w-4 text-muted-foreground" />
                           <span className="font-medium text-sm">
                             {review.profiles?.full_name || 'Usuário Anônimo'}
                           </span>
                         </div>
                         {renderStars(review.rating)}
                       </div>
                       
                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <Calendar className="h-3 w-3" />
                         <span>{formatDate(review.created_at)}</span>
                       </div>
                     </div>

                     {user && review.user_id === user.id && (
                       <Badge variant="outline" className="text-xs shrink-0">
                         Sua avaliação
                       </Badge>
                     )}
                   </div>

                  {review.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
                
                {index < reviews.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        )}

        {!isAuthenticated && totalReviews > 0 && (
          <Alert>
            <AlertDescription>
              Faça login para deixar sua avaliação sobre este produto
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductReviews;