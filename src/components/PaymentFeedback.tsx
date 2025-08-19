import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentFeedbackProps {
  status: "pending" | "approved" | "rejected" | "in_process";
  method: "PIX" | "CREDIT";
  onClose?: () => void;
}

export function PaymentFeedback({ status, method, onClose }: PaymentFeedbackProps) {
  const { toast } = useToast();

  useEffect(() => {
    const config = getStatusConfig(status, method);
    
    toast({
      title: config.title,
      description: config.description,
      variant: config.variant,
      duration: 5000,
    });

    if (onClose) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, method, onClose, toast]);

  const getStatusConfig = (status: string, method: string) => {
    switch (status) {
      case "approved":
        return {
          title: "✅ Pagamento Aprovado!",
          description: `Seu pagamento via ${method === "PIX" ? "PIX" : "cartão"} foi processado com sucesso.`,
          variant: "default" as const,
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          color: "border-green-200 bg-green-50"
        };
      case "pending":
        return {
          title: "⏳ Pagamento Pendente",
          description: method === "PIX" 
            ? "Seu PIX foi gerado. Complete o pagamento para confirmar o pedido."
            : "Seu pagamento está sendo processado. Aguarde a confirmação.",
          variant: "default" as const,
          icon: <Clock className="h-6 w-6 text-yellow-600" />,
          color: "border-yellow-200 bg-yellow-50"
        };
      case "in_process":
        return {
          title: "🔄 Pagamento em Processamento",
          description: "Seu pagamento está sendo analisado. Você receberá uma confirmação em breve.",
          variant: "default" as const,
          icon: <Clock className="h-6 w-6 text-blue-600" />,
          color: "border-blue-200 bg-blue-50"
        };
      case "rejected":
        return {
          title: "❌ Pagamento Rejeitado",
          description: "Houve um problema com seu pagamento. Verifique os dados e tente novamente.",
          variant: "destructive" as const,
          icon: <AlertCircle className="h-6 w-6 text-red-600" />,
          color: "border-red-200 bg-red-50"
        };
      default:
        return {
          title: "Processando Pagamento",
          description: "Aguarde enquanto processamos seu pagamento...",
          variant: "default" as const,
          icon: <Clock className="h-6 w-6 text-gray-600" />,
          color: "border-gray-200 bg-gray-50"
        };
    }
  };

  const config = getStatusConfig(status, method);

  return (
    <Card className={`fixed top-4 right-4 w-96 z-50 ${config.color} shadow-lg`}>
      <CardContent className="flex items-start gap-3 pt-6">
        {config.icon}
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}