import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './config/env';
import { initSocket } from './config/socket';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import pointsRoutes from './modules/points/points.routes';
import nodeRoutes from './modules/node/node.routes';
import referralRoutes from './modules/referral/referral.routes';
import taskRoutes from './modules/task/task.routes';
import epochRoutes from './modules/epoch/epoch.routes';
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes';
import adminRoutes from './modules/admin/admin.routes';
import relayRoutes from './modules/relay/relay.routes';
import gamificationRoutes from './modules/gamification/gamification.routes';
import guildRoutes from './modules/guild/guild.routes';

// Services
import { RelaySimulator } from './modules/relay/relay.service';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Global middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter(200, 60000)); // 200 requests per minute globally

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'OrbitLink Relay Infrastructure API' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/epochs', epochRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/relay', relayRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/guilds', guildRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
httpServer.listen(env.PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║     OrbitLink Relay Infrastructure API            ║
  ║     Port: ${env.PORT}                                   ║
  ║     Mode: ${env.NODE_ENV.padEnd(18)}               ║
  ║     Relay Simulation: Active                      ║
  ╚═══════════════════════════════════════════════════╝
  `);

  // Start AI Relay Simulation Engine
  const relaySimulator = new RelaySimulator();
  relaySimulator.start();
});

export default app;
