import { Router } from 'express';
import { getMenu, createCategory, updateCategory, deleteCategory, createFoodItem, updateFoodItem, deleteFoodItem } from '../controllers/menuController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import { Role } from '../types';

const router = Router();

router.use(authenticateJWT);

router.get('/', getMenu);
router.post('/categories', authorizeRoles(Role.ADMIN), createCategory);
router.put('/categories/:id', authorizeRoles(Role.ADMIN), updateCategory);
router.delete('/categories/:id', authorizeRoles(Role.ADMIN), deleteCategory);

router.post('/items', authorizeRoles(Role.ADMIN), createFoodItem);
router.put('/items/:id', authorizeRoles(Role.ADMIN), updateFoodItem);
router.delete('/items/:id', authorizeRoles(Role.ADMIN), deleteFoodItem);

export default router;
