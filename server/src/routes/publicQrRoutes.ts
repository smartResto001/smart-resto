import { Router } from 'express';
import {
  getPublicTableInfo,
  getPublicMenu,
  createPublicQrOrder,
  getPublicActiveOrders,
  callWaiter,
  submitFeedback,
  processPublicQrPayment,
} from '../controllers/publicQrController';

const router = Router();

// Public Unauthenticated Endpoints for Table QR Customers
router.get('/:tableNumber/:qrToken/info', getPublicTableInfo);
router.get('/:tableNumber/:qrToken/menu', getPublicMenu);
router.post('/:tableNumber/:qrToken/order', createPublicQrOrder);
router.get('/:tableNumber/:qrToken/orders/:sessionId', getPublicActiveOrders);
router.post('/:tableNumber/:qrToken/call-waiter', callWaiter);
router.post('/:tableNumber/:qrToken/feedback', submitFeedback);
router.post('/:tableNumber/:qrToken/pay', processPublicQrPayment);

export default router;
