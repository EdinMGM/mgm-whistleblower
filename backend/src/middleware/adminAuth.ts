import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { AdminContext } from '../lib/permissions';
import logger from '../lib/logger';

/**
 * Middleware: provjerava JWT iz httpOnly cookieja.
 * Ako je validan, postavlja req.admin sa AdminContext podacima.
 */
export async function requireAdmin(
  req: Request & { admin?: AdminContext },
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.admin_token;
    if (!token) {
      throw new UnauthorizedError('Niste prijavljeni');
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;
      username: string;
      role: string;
      canAccessSensitive: boolean;
      isSuperAdmin: boolean;
    };

    // Provjeri da li je korisnik i dalje aktivan u bazi
    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        role: true,
        canAccessSensitive: true,
        isSuperAdmin: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      res.clearCookie('admin_token');
      throw new UnauthorizedError('Sesija je istekla ili je korisnik deaktiviran');
    }

    req.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      canAccessSensitive: admin.canAccessSensitive,
      isSuperAdmin: admin.isSuperAdmin,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
    } else {
      logger.debug({ err }, 'JWT verification failed');
      next(new UnauthorizedError('Neispravna sesija'));
    }
  }
}

/**
 * Middleware: provjerava da li je korisnik ADMIN uloge.
 * Mora se koristiti nakon requireAdmin.
 */
export function requireRole(...roles: string[]) {
  return (req: Request & { admin?: AdminContext }, _res: Response, next: NextFunction): void => {
    if (!req.admin) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.admin.role)) {
      next(new ForbiddenError('Ova akcija zahtijeva viša ovlaštenja'));
      return;
    }
    next();
  };
}
