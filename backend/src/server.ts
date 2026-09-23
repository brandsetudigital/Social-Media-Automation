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

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ extended: true, limit: '300mb' }));

// Ensure uploads folder exists and serve statically
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

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
