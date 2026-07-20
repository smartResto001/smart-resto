import { Router } from 'express';
import { getDashboardStats } from '../controllers/reportController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import { Role } from '../types';

const router = Router();

router.use(authenticateJWT);
router.get('/dashboard', authorizeRoles(Role.ADMIN), getDashboardStats);

export default router;
