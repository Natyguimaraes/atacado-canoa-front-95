// src/lib/schemas.ts
import { z } from 'zod';

// Schema para validação de CPF
const cpfSchema = z.string()
  .min(11, 'CPF deve ter 11 dígitos')
  .max(14, 'CPF inválido')
  .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Formato de CPF inválido');

// Schema para dados de entrega
export const shippingDataSchema = z.object({
  fullName: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z.string()
    .email('E-mail inválido')
    .max(255, 'E-mail muito longo'),
  phone: z.string()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .max(15, 'Telefone muito longo'),
  cpf: cpfSchema,
  zipCode: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  address: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(255, 'Endereço muito longo'),
  number: z.string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número muito longo'),
  complement: z.string().max(100, 'Complemento muito longo').optional(),
  neighborhood: z.string()
    .min(2, 'Bairro deve ter pelo menos 2 caracteres')
    .max(100, 'Bairro muito longo'),
  city: z.string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade muito longa'),
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve ter 2 letras maiúsculas')
});

// Schema para item do carrinho
export const cartItemSchema = z.object({
  product_id: z.string().uuid('ID do produto inválido'),
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  price: z.number().positive('Preço deve ser positivo'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  size: z.string().min(1, 'Tamanho é obrigatório'),
  image: z.string().url('URL da imagem inválida').optional()
});

// Schema para dados do pedido
export const orderDataSchema = z.object({
  user_id: z.string().uuid('ID do usuário inválido'),
  items: z.array(cartItemSchema).min(1, 'Carrinho não pode estar vazio'),
  total_amount: z.number().positive('Total deve ser positivo'),
  shipping_data: shippingDataSchema
});

// Schema para dados de pagamento com cartão
export const cardPaymentDataSchema = z.object({
  token: z.string().min(1, 'Token do cartão é obrigatório'),
  issuer_id: z.string().min(1, 'ID do emissor é obrigatório'),
  payment_method_id: z.string().min(1, 'ID do método de pagamento é obrigatório'),
  installments: z.number().int().min(1).max(24, 'Número de parcelas inválido'),
  payer: z.object({
    email: z.string().email('E-mail do pagador inválido'),
    identification: z.object({
      type: z.string(),
      number: z.string()
    })
  })
});

// Schema para resposta do webhook
export const webhookDataSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string()
  })
});

export type ShippingData = z.infer<typeof shippingDataSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type OrderData = z.infer<typeof orderDataSchema>;
export type CardPaymentData = z.infer<typeof cardPaymentDataSchema>;
export type WebhookData = z.infer<typeof webhookDataSchema>;