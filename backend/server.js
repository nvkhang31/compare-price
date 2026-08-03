require('dotenv').config();

const http    = require('http');
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const helmet  = require('helmet');
const { Server: SocketServer } = require('socket.io');

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const healthRouter      = require('./src/routes/health');
const { startScheduler } = require('./src/schedulers/dailySync');
const pricesRouter      = require('./src/routes/prices');
const comparisonsRouter = require('./src/routes/comparisons');
const alertsRouter      = require('./src/routes/alerts');
const auditLogsRouter   = require('./src/routes/auditLogs');
const statsRouter       = require('./src/routes/stats');
const configRouter      = require('./src/routes/config');
const gameRouter        = require('./src/routes/game');
const sudokuScoreRouter = require('./src/routes/sudokuScore');

// Models — imported here so Mongoose registers schemas and creates indexes on startup
require('./src/models/StockPrice');
require('./src/models/Comparison');
require('./src/models/Alert');
require('./src/models/AuditLog');
require('./src/models/Config');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Socket.io — Caro realtime
const io = new SocketServer(server, {
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',').map(o => o.trim()).filter(Boolean),
    methods: ['GET', 'POST']
  }
});
require('./src/socket/caroSocket')(io);

// Parse CORS_ORIGIN thành array nếu có nhiều origins (VD: "http://localhost:3000,https://xxx.vercel.app")
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Middleware
app.use(helmet());
app.use(cors({ origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Routes
app.use('/api/health',      healthRouter);
app.use('/api/prices',      pricesRouter);
app.use('/api/comparisons', comparisonsRouter);
app.use('/api/alerts',      alertsRouter);
app.use('/api/audit-logs',  auditLogsRouter);
app.use('/api/stats',       statsRouter);
app.use('/api/config',      configRouter);
app.use('/api/game',        gameRouter);
app.use('/api/game/sudoku', sudokuScoreRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` });
});

// Global error handler
app.use(errorHandler);

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  startScheduler();

  // Seed VN30 list into DB on first startup if not present
  try {
    const { getVN30Symbols, refreshVN30, FALLBACK_VN30 } = require('./src/services/indexService');
    const Config = require('./src/models/Config');
    const existing = await Config.findOne({ key: 'vn30_symbols' });
    if (!existing) {
      await Config.create({ key: 'vn30_symbols', value: FALLBACK_VN30, updatedAt: new Date() });
      console.log('[Server] VN30 fallback list seeded to DB');
    }
  } catch (e) {
    console.warn('[Server] VN30 seed failed (non-fatal):', e.message);
  }
});

module.exports = app;
