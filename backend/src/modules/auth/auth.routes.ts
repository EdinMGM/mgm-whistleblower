import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { requireAdmin } from '../../middleware/adminAuth';
import { env } from '../../config/env';
import { rateLimit } from 'express-rate-limit';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Korisničko ime je obavezno'),
  password: z.string().min(1, 'Lozinka je obavezna'),
});

// Rate limiting za admin login (5 pokušaja u 15 minuta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMIT_EXCEEDED', message: 'Previše pokušaja prijave. Pokušajte kasnije.' },
});

/**
 * POST /api/auth/login
 * Prijava administratora. Token se postavlja u httpOnly cookie.
 */
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { username, password } = loginSchema.parse(req.body);
  const { token, admin } = await authService.login(username, password);

  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 sati
  });

  res.json({ admin });
});

/**
 * POST /api/auth/logout
 * Odjava — briše cookie.
 */
router.post('/logout', requireAdmin, async (req: Request & { admin?: { id: string } }, res: Response) => {
  if (req.admin) {
    await authService.logout(req.admin.id);
  }
  res.clearCookie('admin_token');
  res.json({ message: 'Uspješno odjavljeni' });
});

/**
 * GET /api/auth/me
 * Vraća trenutno prijavljenog admina (za frontend provjeru sesije).
 */
router.get('/me', requireAdmin, (req: Request & { admin?: any }, res: Response) => {
  res.json({ admin: req.admin });
});

export const authRouter = router;
