const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'PromijeniMe123!';

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    console.log('Admin "' + username + '" vec postoji.');
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.adminUser.create({
    data: { username, passwordHash, role: 'ADMIN', canAccessSensitive: true, isSuperAdmin: true, isActive: true }
  });
  console.log('Admin kreiran: ' + username);
}

main().catch(console.error).finally(() => prisma.$disconnect());
