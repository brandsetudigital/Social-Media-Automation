import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import driveRoutes from './routes/drive.routes';
import contentRoutes from './routes/content.routes';
import approvalRoutes from './routes/approval.routes';
import ruleRoutes from './routes/rule.routes';
import queueRoutes from './routes/queue.routes';
import schedulerRoutes from './routes/scheduler.routes';
import socialRoutes from './routes/social.routes';
import aiRoutes from './routes/ai.routes';
import analyticsRoutes from './routes/analytics.routes';
import userRoutes from './routes/user.routes';
import systemRoutes from './routes/system.routes';
import { PublishingService } from './services/PublishingService';

import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ extended: true, limit: '300mb' }));

// Ensure uploads folder exists and serve statically with CORS
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}, express.static(uploadsDir, { maxAge: '7d' }));

// Status Landing Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BrandSetu Digital API</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0b0f19; color: #fff; padding: 20px; }
          .card { background: #161f30; padding: 36px 32px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; max-width: 440px; width: 100%; border: 1px solid #1f2d47; }
          .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: rgba(16, 185, 129, 0.15); color: #10b981; border-radius: 99px; font-size: 13px; font-weight: 600; margin-bottom: 18px; border: 1px solid rgba(16, 185, 129, 0.3); }
          .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; }
          h1 { margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #f8fafc; }
          p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0; }
          .btn { display: inline-block; background: #0172F4; color: #fff; padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; text-decoration: none; transition: 0.2s; }
          .btn:hover { background: #005cd3; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge"><div class="dot"></div> Server Live & Running</div>
          <h1>BrandSetu Digital API Engine</h1>
          <p>Social Media Automation & Publishing Engine is deployed successfully on Hostinger.</p>
          <a class="btn" href="/api/health">Check API Health Status</a>
        </div>
      </body>
    </html>
  `);
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'BrandSetu Digital - Agency Operating System',
    timestamp: new Date().toISOString(),
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/system', systemRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[BrandSetu API Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Agency Server Error',
  });
});

// Start Background Scheduler Engine (every 30s)
const SCHEDULER_INTERVAL_MS = 30000;
setInterval(async () => {
  try {
    const tick = await PublishingService.runSchedulerTick();
    if (tick.processed > 0) {
      console.log(`[Scheduler Worker] Processed ${tick.processed} due posts at ${new Date().toLocaleTimeString()}`);
    }
  } catch (err) {
    console.error('[Scheduler Worker Error]', err);
  }
}, SCHEDULER_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` BRANDSETU DIGITAL - SMM OPERATING SYSTEM BACKEND `);
  console.log(` Server running on http://localhost:${PORT}          `);
  console.log(` Health check at http://localhost:${PORT}/api/health `);
  console.log(`====================================================`);
});
