import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  isLoading: boolean;
}

export const useProductReviews = (productId: string): ReviewStats => {
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviewStats = async () => {
      try {
        const { data, error } = await supabase
          .from('product_reviews')
          .select('rating')
          .eq('product_id', productId);

        if (error) throw error;

        const reviews = data || [];
        setTotalReviews(reviews.length);

        if (reviews.length > 0) {
          const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
          setAverageRating(sum / reviews.length);
        } else {
          setAverageRating(0);
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas das avaliações:', error);
        setAverageRating(0);
        setTotalReviews(0);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchReviewStats();
    }
  }, [productId]);

  return { averageRating, totalReviews, isLoading };
};