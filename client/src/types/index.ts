export type Role = 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CASHIER';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'PAID'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'WALLET'
  | 'SPLIT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  status: TableStatus;
  orders?: Order[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  foodItems?: FoodItem[];
}

export interface FoodItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  prepTime: number;
  availability: boolean;
  isVeg: boolean;
  image?: string;
  categoryId: string;
  category?: Category;
}

export interface OrderItem {
  id?: string;
  foodItemId: string;
  foodItem?: FoodItem;
  quantity: number;
  unitPrice: number;
  notes?: string;
  status?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tokenNumber: number;
  customerName: string;
  tableId: string;
  table: Table;
  waiterId?: string;
  waiter?: { name: string; email?: string };
  status: OrderStatus;
  totalAmount: number;
  taxAmount: number;
  discountAmount?: number;
  grandTotal: number;
  specialInstructions?: string;
  items: OrderItem[];
  payment?: Payment;
  orderTime: string;
  readyTime?: string;
  servedTime?: string;
  completedTime?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  order?: Order;
  cashierId?: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  transactionId?: string;
  cashierName: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  roleTarget?: Role;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalCompletedOrders: number;
  totalCancelledOrders: number;
  activeOrdersCount: number;
  totalRevenue: number;
  avgOrderValue: number;
  topFoods: {
    id?: string;
    name: string;
    category: string;
    totalQuantity: number;
    price: number;
  }[];
  recentPayments: Payment[];
}
