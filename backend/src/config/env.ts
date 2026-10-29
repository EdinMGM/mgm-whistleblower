import dotenv from 'dotenv';
import { z } from 'zod';

// Učitaj .env fajl
dotenv.config({ path: '../.env' });

// Zod šema za validaciju environment varijabli
// Ako je bilo koja obavezna varijabla nedostaje, aplikacija neće startovati
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL je obavezna'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET mora imati najmanje 32 karaktera'),
  JWT_EXPIRES_IN: z.string().default('8h'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@mgmfarm.ba'),

  NOTIFICATION_EMAIL_GENERAL: z.string().email().default('neuskladjenost@mgmfarm.ba'),
  NOTIFICATION_EMAIL_LEGAL: z.string().optional(),

  FIRST_RESPONSE_DAYS: z.coerce.number().default(7),
  STATUS_UPDATE_DAYS: z.coerce.number().default(30),

  MAX_ATTACHMENT_SIZE_MB: z.coerce.number().default(10),
  ALLOWED_MIME_TYPES: z.string().default(
    'application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'
  ),

  UPLOAD_DIR: z.string().default('./uploads'),
  RETENTION_DAYS: z.coerce.number().default(730),

  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Greška u konfiguraciji environment varijabli:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Parsovani MIME tipovi kao niz
export const allowedMimeTypes: string[] = env.ALLOWED_MIME_TYPES.split(',').map((t) => t.trim());

// Maksimalna veličina priloga u bajtima
export const maxAttachmentSizeBytes: number = env.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
