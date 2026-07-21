"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = exports.OrderStatus = exports.TableStatus = exports.Role = void 0;
exports.Role = {
    ADMIN: 'ADMIN',
    WAITER: 'WAITER',
    KITCHEN: 'KITCHEN',
    BILLING: 'BILLING',
    USER: 'USER',
};
exports.TableStatus = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    RESERVED: 'RESERVED',
    CLEANING: 'CLEANING',
};
exports.OrderStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    PREPARING: 'PREPARING',
    READY: 'READY',
    SERVED: 'SERVED',
    COMPLETED: 'COMPLETED',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED',
};
exports.PaymentMethod = {
    CASH: 'CASH',
    UPI: 'UPI',
    CREDIT_CARD: 'CREDIT_CARD',
    DEBIT_CARD: 'DEBIT_CARD',
    WALLET: 'WALLET',
    SPLIT: 'SPLIT',
};
