import { Router } from 'express';
import { getAllTables, updateTableStatus, createTable, deleteTable } from '../controllers/tableController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import { Role } from '../types';

const router = Router();

router.use(authenticateJWT);

router.get('/', getAllTables);
router.put('/:id/status', updateTableStatus);
router.post('/', authorizeRoles(Role.ADMIN), createTable);
router.delete('/:id', authorizeRoles(Role.ADMIN), deleteTable);

export default router;
