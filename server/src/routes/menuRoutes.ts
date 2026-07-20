import { Router } from 'express';
import { getMenu, createCategory, createFoodItem, updateFoodItem, deleteFoodItem } from '../controllers/menuController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import { Role } from '../types';

const router = Router();

router.use(authenticateJWT);

router.get('/', getMenu);
router.post('/categories', authorizeRoles(Role.ADMIN), createCategory);
router.post('/items', authorizeRoles(Role.ADMIN), createFoodItem);
router.put('/items/:id', authorizeRoles(Role.ADMIN), updateFoodItem);
router.delete('/items/:id', authorizeRoles(Role.ADMIN), deleteFoodItem);

export default router;
