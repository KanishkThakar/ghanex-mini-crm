import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { leadsRouter, statsRouter, STATUSES, SOURCES } from './leads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.get('/api/meta', (_req, res) => res.json({ data: { statuses: STATUSES, sources: SOURCES } }));
  app.use('/api/leads', leadsRouter(db));
  app.use('/api/stats', statsRouter(db));

  // Unknown API routes answer in JSON, never the SPA shell.
  app.use('/api', (_req, res) => res.status(404).json({ error: { message: 'Endpoint not found' } }));

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  // One error shape for every failure the client sees.
  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) {
      const details = {};
      for (const issue of err.issues) details[issue.path.join('.') || '_'] = issue.message;
      return res.status(422).json({ error: { message: 'Please check the highlighted fields', details } });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { message: 'Request body is not valid JSON' } });
    }
    console.error(err);
    res.status(500).json({ error: { message: 'Something went wrong on our side' } });
  });

  return app;
}
