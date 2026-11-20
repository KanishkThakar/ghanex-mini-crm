import { Router } from 'express';
import { z } from 'zod';

export const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted'];
export const SOURCES = ['Website', 'Instagram', 'LinkedIn', 'Referral', 'Email', 'Walk-in', 'Other'];

const statusEnum = z.enum(STATUSES);

const leadBody = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s()-]{7,20}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  company: z.string().trim().max(80).optional().or(z.literal('')),
  source: z.string().trim().min(1, 'Pick where the lead came from').max(40),
  status: statusEnum.default('New'),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  value: z.coerce.number().int('Deal value must be a whole number').min(0).max(100000000).default(0),
});

const createSchema = leadBody;
const updateSchema = leadBody.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Send at least one field to update',
});

const listQuery = z.object({
  search: z.string().trim().max(120).optional(),
  status: statusEnum.optional(),
  sort: z.enum(['updated_at', 'created_at', 'name', 'value']).default('updated_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const now = () => new Date().toISOString();

function toLead(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    company: row.company ?? '',
    source: row.source,
    status: row.status,
    notes: row.notes ?? '',
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function leadsRouter(db) {
  const router = Router();
  const getById = db.prepare('SELECT * FROM leads WHERE id = ?');

  router.get('/', (req, res, next) => {
    try {
      const q = listQuery.parse(req.query);
      const where = [];
      const params = {};

      if (q.search) {
        where.push('(name LIKE @like OR email LIKE @like OR company LIKE @like OR phone LIKE @like OR source LIKE @like)');
        params.like = `%${q.search}%`;
      }
      if (q.status) {
        where.push('status = @status');
        params.status = q.status;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const orderSql = `ORDER BY ${q.sort} ${q.order.toUpperCase()}, id DESC`;

      const total = db.prepare(`SELECT COUNT(*) AS n FROM leads ${whereSql}`).get(params).n;
      const rows = db
        .prepare(`SELECT * FROM leads ${whereSql} ${orderSql} LIMIT @limit OFFSET @offset`)
        .all({ ...params, limit: q.limit, offset: q.offset });

      res.json({ data: rows.map(toLead), total, limit: q.limit, offset: q.offset });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      const row = getById.get(Number(req.params.id));
      if (!row) return res.status(404).json({ error: { message: 'Lead not found' } });
      res.json({ data: toLead(row) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const ts = now();
      const info = db
        .prepare(
          `INSERT INTO leads (name, email, phone, company, source, status, notes, value, created_at, updated_at)
           VALUES (@name, @email, @phone, @company, @source, @status, @notes, @value, @createdAt, @updatedAt)`,
        )
        .run({
          name: body.name,
          email: body.email,
          phone: body.phone || null,
          company: body.company || null,
          source: body.source,
          status: body.status,
          notes: body.notes || null,
          value: body.value,
          createdAt: ts,
          updatedAt: ts,
        });
      res.status(201).json({ data: toLead(getById.get(info.lastInsertRowid)) });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = getById.get(id);
      if (!existing) return res.status(404).json({ error: { message: 'Lead not found' } });

      const body = updateSchema.parse(req.body);
      const merged = {
        id,
        name: body.name ?? existing.name,
        email: body.email ?? existing.email,
        phone: body.phone === undefined ? existing.phone : body.phone || null,
        company: body.company === undefined ? existing.company : body.company || null,
        source: body.source ?? existing.source,
        status: body.status ?? existing.status,
        notes: body.notes === undefined ? existing.notes : body.notes || null,
        value: body.value ?? existing.value,
        updatedAt: now(),
      };

      db.prepare(
        `UPDATE leads SET name=@name, email=@email, phone=@phone, company=@company, source=@source,
         status=@status, notes=@notes, value=@value, updated_at=@updatedAt WHERE id=@id`,
      ).run(merged);

      res.json({ data: toLead(getById.get(id)) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      const info = db.prepare('DELETE FROM leads WHERE id = ?').run(Number(req.params.id));
      if (info.changes === 0) return res.status(404).json({ error: { message: 'Lead not found' } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function statsRouter(db) {
  const router = Router();

  router.get('/', (_req, res, next) => {
    try {
      const total = db.prepare('SELECT COUNT(*) AS n FROM leads').get().n;
      const rows = db
        .prepare('SELECT status, COUNT(*) AS n, COALESCE(SUM(value), 0) AS v FROM leads GROUP BY status')
        .all();
      const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
      const valueByStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
      for (const r of rows) {
        byStatus[r.status] = r.n;
        valueByStatus[r.status] = r.v;
      }
      const bySource = db
        .prepare('SELECT source, COUNT(*) AS n FROM leads GROUP BY source ORDER BY n DESC')
        .all()
        .map((r) => ({ source: r.source, count: r.n }));
      res.json({
        data: {
          total,
          byStatus,
          valueByStatus,
          bySource,
          pipelineValue: rows.reduce((sum, r) => sum + r.v, 0),
          conversionRate: total === 0 ? 0 : Math.round((byStatus.Converted / total) * 1000) / 10,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
