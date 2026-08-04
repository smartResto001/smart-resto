import { Router } from 'express';
import {
  getAllHotelAccounts,
  toggleAccountLock,
  deleteHotelAccount,
  createHotelAccount,
  updateSubscriptionSettings,
  getGlobalSubscriptionSettings,
  updateGlobalSubscriptionSettings,
} from '../controllers/chiefAdminController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import { Role } from '../types';

const router = Router();

// Protect all Chief Admin endpoints
router.use(authenticateJWT);
router.use(authorizeRoles(Role.CHIEF_ADMIN));

router.get('/subscription-settings', getGlobalSubscriptionSettings);
router.put('/subscription-settings', updateGlobalSubscriptionSettings);
router.get('/users', getAllHotelAccounts);
router.post('/users', createHotelAccount);
router.put('/users/:id/lock', toggleAccountLock);
router.put('/users/:id/subscription', updateSubscriptionSettings);
router.delete('/users/:id', deleteHotelAccount);

export default router;
