import { Router } from 'express';
import { getAllUsers, createUser, deleteUser } from '../controllers/userController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import { Role } from '../types';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles(Role.ADMIN));

router.get('/', getAllUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);

export default router;
