export type TPaymentMethod = "PIX" | "CARD" | "DEBIT" | "CREDIT";

export type TPaymentStatus = "PENDING" | "PAID" | "CANCELED" | "EXPIRED" | "REFUNDED" | "FAILED" | "IN_PROCESS" | "APPROVED" | "REJECTED";

export type TPaymentProvider = "MERCADO_PAGO";

export interface IPixPaymentData {
  paymentInfo: {
    qrCodeBase64: string | undefined;
    qrCode: string | undefined;
    expirationDate: string | undefined;
  };
  amountToPay: number;
  paymentId: string;
}

export interface ICardPaymentData {
  amountToPay: number;
  paymentId: string;
}

export interface PixPaymentMetadata {
  qrCodeBase64: string;
  qrCode: string;
  expirationDate: string;
}

export interface CreditCardPaymentMetadata {
  cardId: string;
}

export type TPaymentMetadata = PixPaymentMetadata | CreditCardPaymentMetadata | null;

export interface IPayment {
  id: string;
  method: TPaymentMethod;
  status: TPaymentStatus;
  amount: string;
  paidAt: string | null;
  provider: TPaymentProvider;
  externalId: string;
  metadata: TPaymentMetadata;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export type TPaymentProfile = {
  id: string;
  zipCode: string;
  streetName: string;
  streetNumber: string;
  createdAt: string;
  updatedAt: string;
}