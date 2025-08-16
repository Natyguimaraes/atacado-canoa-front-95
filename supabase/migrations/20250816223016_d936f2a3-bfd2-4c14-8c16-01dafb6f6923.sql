-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  method TEXT NOT NULL CHECK (method IN ('PIX', 'CARD', 'DEBIT', 'CREDIT')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELED', 'EXPIRED', 'REFUNDED', 'FAILED', 'IN_PROCESS')),
  amount DECIMAL(10,2) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  provider TEXT NOT NULL DEFAULT 'MERCADO_PAGO' CHECK (provider IN ('MERCADO_PAGO')),
  external_id TEXT NOT NULL,
  metadata JSONB NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all payments" 
ON public.payments 
FOR SELECT 
USING (auth.email() = 'admin@atacadocanoa.com');

CREATE POLICY "Admin can update all payments" 
ON public.payments 
FOR UPDATE 
USING (auth.email() = 'admin@atacadocanoa.com');

-- Create indexes
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_external_id ON public.payments(external_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_method ON public.payments(method);

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create payment_profiles table for address data
CREATE TABLE public.payment_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  zip_code TEXT NOT NULL,
  street_name TEXT NOT NULL,
  street_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for payment_profiles
ALTER TABLE public.payment_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_profiles
CREATE POLICY "Users can view their own payment profile" 
ON public.payment_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment profile" 
ON public.payment_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment profile" 
ON public.payment_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for payment_profiles updated_at
CREATE TRIGGER update_payment_profiles_updated_at
BEFORE UPDATE ON public.payment_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();