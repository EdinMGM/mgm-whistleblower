import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { verifyPassword } from '../../lib/crypto';
import { UnauthorizedError, ForbiddenError } from '../../lib/errors';
import logger from '../../lib/logger';

export const authService = {
  /**
   * Prijava administratora.
   * Provjerava korisničko ime i lozinku, vraća JWT token.
   */
  async login(username: string, password: string): Promise<{ token: string; admin: { id: string; username: string; role: string; canAccessSensitive: boolean; isSuperAdmin: boolean } }> {
    const admin = await prisma.adminUser.findUnique({
      where: { username },
    });

    // Ista greška za nepostojećeg korisnika i pogrešnu lozinku
    if (!admin || !admin.isActive) {
      throw new UnauthorizedError('Neispravno korisničko ime ili lozinka');
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Neispravno korisničko ime ili lozinka');
    }

    const token = jwt.sign(
      {
        sub: admin.id,
        username: admin.username,
        role: admin.role,
        canAccessSensitive: admin.canAccessSensitive,
        isSuperAdmin: admin.isSuperAdmin,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any },
    );

    // Zapiši aktivnost prijave
    await prisma.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_LOGIN',
        details: `Korisnik ${admin.username} se prijavio`,
      },
    });

    logger.info({ adminId: admin.id, username: admin.username }, 'Admin logged in');

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        canAccessSensitive: admin.canAccessSensitive,
        isSuperAdmin: admin.isSuperAdmin,
      },
    };
  },

  /**
   * Odjava — briše cookie na frontendu. Backend samo logira.
   */
  async logout(adminId: string): Promise<void> {
    await prisma.activityLog.create({
      data: {
        adminId,
        action: 'ADMIN_LOGOUT',
        details: 'Korisnik se odjavio',
      },
    });
    logger.info({ adminId }, 'Admin logged out');
  },
};
