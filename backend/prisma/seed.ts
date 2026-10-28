import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Seed skripta — kreira prvog admin korisnika.
 * Pokreni sa: npm run seed
 *
 * Korisničko ime i lozinka se mogu konfigurisati preko env varijabli:
 * SEED_ADMIN_USERNAME (default: admin)
 * SEED_ADMIN_PASSWORD (default: PromijeniMe123!)
 */
async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'PromijeniMe123!';

  const existing = await prisma.adminUser.findUnique({ where: { username } });

  if (existing) {
    console.log(`Admin korisnik "${username}" već postoji — preskačem.`);
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      role: 'ADMIN',
      canAccessSensitive: true,
      isActive: true,
    },
  });

  console.log(`✅ Admin korisnik kreiran:`);
  console.log(`   Korisničko ime: ${username}`);
  console.log(`   Lozinka: ${password}`);
  console.log(`   ⚠️  Obavezno promijenite lozinku nakon prvog prijavljivanja!`);
}

main()
  .catch((e) => {
    console.error('Greška pri seed-u:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
