export type Role = 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CASHIER';
export const Role = {
  ADMIN: 'ADMIN',
  WAITER: 'WAITER',
  KITCHEN: 'KITCHEN',
  CASHIER: 'CASHIER',
} as const;

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
export const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  CLEANING: 'CLEANING',
} as const;

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'PAID'
  | 'CANCELLED';
export const OrderStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  COMPLETED: 'COMPLETED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'WALLET'
  | 'SPLIT';
export const PaymentMethod = {
  CASH: 'CASH',
  UPI: 'UPI',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  WALLET: 'WALLET',
  SPLIT: 'SPLIT',
} as const;
