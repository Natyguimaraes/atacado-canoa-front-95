import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const CreateAdmin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const createAdmin = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user');
      
      if (error) {
        throw error;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar administrador');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Criar Administrador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={createAdmin} 
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Admin'
            )}
          </Button>

          {result && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Sucesso!</span>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Email:</strong> atacadocanoa@gmail.com</p>
                  <p><strong>Senha:</strong> Admin@2025!</p>
                  <p className="text-green-600 mt-2">{result.message}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Erro</span>
                </div>
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAdmin;