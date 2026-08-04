export type Role = 'CHIEF_ADMIN' | 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CASHIER';

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

export type OrderSource = 'WAITER' | 'QR';
export type CustomerType = 'REGULAR' | 'WAITER_CUSTOMER' | 'QR_CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  hotelName?: string | null;
  hotelAddress?: string | null;
  hotelPhone?: string | null;
  hotelGst?: string | null;
  upiId?: string | null;
  upiName?: string | null;
  googleId?: string | null;
  provider?: string;
  avatar?: string | null;
  hasAdminPassword?: boolean;
  isLocked?: boolean;
  planName?: string;
  isTrial?: boolean;
  trialDays?: number;
  trialExpiresAt?: string | null;
  monthlyFee?: number;
  subscriptionMonths?: number;
  discountAmount?: number;
  totalPayable?: number;
  isPaid?: boolean;
  subscriptionExpiresAt?: string | null;
  lastPaidAt?: string | null;
  createdAt?: string;
}

export interface SystemSettings {
  id: string;
  defaultPlanName: string;
  defaultMonthlyFee: number;
  defaultSubscriptionMonths: number;
  defaultDiscountAmount: number;
  defaultTrialDays: number;
  updatedAt?: string;
}

export interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  status: TableStatus;
  qrToken?: string | null;
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
  ingredients?: string | null;
  isPopular?: boolean;
  spicyLevel?: number; // 0: None, 1: Mild, 2: Medium, 3: Spicy
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
  orderSource?: OrderSource;
  customerType?: CustomerType;
  numberOfPersons?: number | null;
  sessionId?: string | null;
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

export interface Feedback {
  id: string;
  tableId: string;
  orderId?: string | null;
  ratingFood: number;
  ratingService: number;
  comments?: string | null;
  customerName?: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalCompletedOrders: number;
  totalCancelledOrders: number;
  activeOrdersCount: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalQrOrders?: number;
  totalWaiterOrders?: number;
  mostOrderedTable?: number | string | null;
  mostOrderedFood?: string | null;
  topFoods: {
    id?: string;
    name: string;
    category: string;
    totalQuantity: number;
    price: number;
  }[];
  recentPayments: Payment[];
}
