require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const healthRouter      = require('./src/routes/health');
const { startScheduler } = require('./src/schedulers/dailySync');
const pricesRouter      = require('./src/routes/prices');
const comparisonsRouter = require('./src/routes/comparisons');
const alertsRouter      = require('./src/routes/alerts');
const auditLogsRouter   = require('./src/routes/auditLogs');
const statsRouter       = require('./src/routes/stats');

// Models — imported here so Mongoose registers schemas and creates indexes on startup
require('./src/models/StockPrice');
require('./src/models/Comparison');
require('./src/models/Alert');
require('./src/models/AuditLog');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/health',      healthRouter);
app.use('/api/prices',      pricesRouter);
app.use('/api/comparisons', comparisonsRouter);
app.use('/api/alerts',      alertsRouter);
app.use('/api/audit-logs',  auditLogsRouter);
app.use('/api/stats',       statsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  startScheduler();
});

module.exports = app;
