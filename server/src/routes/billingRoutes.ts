import { Router } from 'express';
import { processPayment, getUnbilledOrders, getPaymentHistory } from '../controllers/billingController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import { Role } from '../types';

const router = Router();

router.use(authenticateJWT);

router.post('/payment', authorizeRoles(Role.CASHIER, Role.ADMIN), processPayment);
router.get('/unbilled', authorizeRoles(Role.CASHIER, Role.ADMIN), getUnbilledOrders);
router.get('/history', authorizeRoles(Role.CASHIER, Role.ADMIN), getPaymentHistory);

export default router;
