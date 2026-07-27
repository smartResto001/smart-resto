import { Router } from 'express';
import {
  login,
  chiefAdminLogin,
  register,
  getMe,
  setAdminPassword,
  verifyAdminPassword,
  resetAdminPasswordWithAccountPassword,
  forgotPassword,
  googleAuth,
} from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/chief-admin/login', chiefAdminLogin);
router.post('/register', register);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticateJWT, getMe);
router.post('/admin-password/set', authenticateJWT, setAdminPassword);
router.post('/admin-password/verify', authenticateJWT, verifyAdminPassword);
router.post('/admin-password/reset', authenticateJWT, resetAdminPasswordWithAccountPassword);

export default router;
