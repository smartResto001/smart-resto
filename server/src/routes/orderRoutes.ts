import { Router } from 'express';
import { createOrder, getAllOrders, getOrderById, updateOrderStatus, cancelOrder } from '../controllers/orderController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', createOrder);
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);
router.delete('/:id', cancelOrder);

export default router;
