import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from './admin.service';
import { requireAdmin, requireRole } from '../../middleware/adminAuth';
import { AdminContext } from '../../lib/permissions';

const router = Router();

// Sve rute zahtijevaju admin autentifikaciju
router.use(requireAdmin);

// ── Pregled prijava ──

const listQuerySchema = z.object({
  reportType: z.preprocess((v) => v === '' ? undefined : v, z.enum(['GENERAL', 'SENSITIVE']).optional()),
  status: z.preprocess((v) => v === '' ? undefined : v, z.string().optional()),
  search: z.preprocess((v) => v === '' ? undefined : v, z.string().optional()),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

router.get('/reports', async (req: Request & { admin?: AdminContext }, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const result = await adminService.listReports(req.admin!, query);
  res.json(result);
});

router.get('/reports/:id', async (req: Request & { admin?: AdminContext }, res: Response) => {
  const report = await adminService.getReportDetail(req.admin!, req.params.id);
  res.json(report);
});

// ── Promjena statusa ──

const changeStatusSchema = z.object({
  status: z.enum(['ZAPRIMLJENA', 'U_PROCJENI', 'POTREBNE_INFO', 'U_OBRADI', 'PROSLIJEDJENA', 'ZAVRSENA', 'ZATVORENA']),
});

router.patch('/reports/:id/status', async (req: Request & { admin?: AdminContext }, res: Response) => {
  const { status } = changeStatusSchema.parse(req.body);
  const result = await adminService.changeStatus(req.admin!, req.params.id, status as any);
  res.json(result);
});

// ── Odgovor prijavitelju ──

const replySchema = z.object({
  content: z.string().min(1, 'Poruka ne može biti prazna').max(5000),
});

router.post('/reports/:id/reply', async (req: Request & { admin?: AdminContext }, res: Response) => {
  const { content } = replySchema.parse(req.body);
  const message = await adminService.replyToReporter(req.admin!, req.params.id, content);
  res.status(201).json(message);
});

// ── Interne bilješke ──

const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});

router.post('/reports/:id/notes', async (req: Request & { admin?: AdminContext }, res: Response) => {
  const { content } = noteSchema.parse(req.body);
  const note = await adminService.addInternalNote(req.admin!, req.params.id, content);
  res.status(201).json(note);
});

// ── Dodjela prijave ──

const assignSchema = z.object({
  adminId: z.string().uuid(),
});

router.post('/reports/:id/assign', async (req: Request & { admin?: AdminContext }, res: Response) => {
  const { adminId } = assignSchema.parse(req.body);
  await adminService.assignReport(req.admin!, req.params.id, adminId);
  res.json({ message: 'Prijava uspješno dodijeljena' });
});

// ── Upravljanje korisnicima (samo ADMIN) ──

router.get('/users', requireRole('ADMIN'), async (req: Request & { admin?: AdminContext }, res: Response) => {
  const users = await adminService.listAdmins(req.admin!);
  res.json(users);
});

const createAdminSchema = z.object({
  username: z.string().min(3, 'Korisničko ime mora imati najmanje 3 karaktera').max(50),
  password: z.string().min(12, 'Lozinka mora imati najmanje 12 karaktera').max(200),
  role: z.enum(['ADMIN', 'INVESTIGATOR']),
  canAccessSensitive: z.boolean().default(false),
  isSuperAdmin: z.boolean().default(false),
});

router.post('/users', requireRole('ADMIN'), async (req: Request & { admin?: AdminContext }, res: Response) => {
  const data = createAdminSchema.parse(req.body);
  const newAdmin = await adminService.createAdmin(req.admin!, data);
  res.status(201).json(newAdmin);
});

// ── Audit log ──

const logQuerySchema = z.object({
  reportId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});

router.get('/activity-log', async (req: Request & { admin?: AdminContext }, res: Response) => {
  const query = logQuerySchema.parse(req.query);
  const result = await adminService.getActivityLog(req.admin!, query);
  res.json(result);
});

export const adminRouter = router;
