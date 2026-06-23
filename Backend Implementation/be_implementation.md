# 🚀 BACKEND IMPLEMENTATION GUIDE - Node.js + Express

## Project Setup

### 1. Initialize Project

```bash
# Create project directory
mkdir ikis-price-comparison
cd ikis-price-comparison/backend

# Initialize Node project
npm init -y

# Install core dependencies
npm install express mongoose axios node-cron dotenv cors helmet winston joi

# Install dev dependencies
npm install --save-dev nodemon eslint

# Create .env file
cp .env.example .env
```

### 2. Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── priceController.js
│   │   ├── comparisonController.js
│   │   ├── alertController.js
│   │   ├── auditController.js
│   │   └── healthController.js
│   │
│   ├── services/
│   │   ├── ikisService.js
│   │   ├── vndirectService.js
│   │   ├── tcbsService.js
│   │   ├── comparisonService.js
│   │   ├── alertService.js
│   │   └── notificationService.js
│   │
│   ├── models/
│   │   ├── StockPrice.js
│   │   ├── Comparison.js
│   │   ├── Alert.js
│   │   ├── AuditLog.js
│   │   └── Symbol.js
│   │
│   ├── routes/
│   │   ├── prices.js
│   │   ├── comparisons.js
│   │   ├── alerts.js
│   │   ├── audit.js
│   │   └── health.js
│   │
│   ├── schedulers/
│   │   ├── dailySync.js
│   │   ├── alertScheduler.js
│   │   └── index.js
│   │
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── requestLogger.js
│   │   ├── validation.js
│   │   └── auth.js (optional for future)
│   │
│   ├── utils/
│   │   ├── logger.js
│   │   ├── retryUtil.js
│   │   ├── validators.js
│   │   └── constants.js
│   │
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js
│   │   └── constants.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Core Files

### server.js (Entry Point)

```javascript
// backend/server.js

require('dotenv').config();
const app = require('./src/app');
const DatabaseConnection = require('./src/config/database');
const DailySyncScheduler = require('./src/schedulers/dailySync');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await DatabaseConnection.connect();
    logger.info('✅ Database connected');

    // Initialize schedulers
    DailySyncScheduler.startDailySync();
    logger.info('✅ Schedulers initialized');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

### app.js (Express Setup)

```javascript
// backend/src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const priceRoutes = require('./routes/prices');
const comparisonRoutes = require('./routes/comparisons');
const alertRoutes = require('./routes/alerts');
const auditRoutes = require('./routes/audit');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Routes
app.use('/api/prices', priceRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/health', healthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
```

---

## API Endpoints

### Prices Routes

```javascript
// backend/src/routes/prices.js

const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');

// Get latest prices
router.get('/', priceController.getAllPrices);

// Get prices for specific symbol
router.get('/:symbol', priceController.getPriceBySymbol);

// Get price history
router.get('/:symbol/history', priceController.getPriceHistory);

// Manual sync (admin)
router.post('/sync', priceController.triggerManualSync);

module.exports = router;
```

### Comparisons Routes

```javascript
// backend/src/routes/comparisons.js

const express = require('express');
const router = express.Router();
const comparisonController = require('../controllers/comparisonController');

// Get all comparisons
router.get('/', comparisonController.getAllComparisons);

// Get comparison for specific symbol
router.get('/:symbol', comparisonController.getSymbolComparison);

// Get summary report
router.get('/report/summary', comparisonController.getReport);

// Get discrepancies only
router.get('/discrepancies/list', comparisonController.getDiscrepancies);

module.exports = router;
```

### Alerts Routes

```javascript
// backend/src/routes/alerts.js

const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Get all alerts
router.get('/', alertController.getAllAlerts);

// Get alert by ID
router.get('/:id', alertController.getAlertById);

// Acknowledge alert
router.put('/:id/acknowledge', alertController.acknowledgeAlert);

// Resolve alert
router.put('/:id/resolve', alertController.resolveAlert);

// Get alerts by status
router.get('/status/:status', alertController.getAlertsByStatus);

// Get alerts by severity
router.get('/severity/:severity', alertController.getAlertsBySeverity);

module.exports = router;
```

---

## Controllers Implementation

### priceController.js

```javascript
// backend/src/controllers/priceController.js

const StockPrice = require('../models/StockPrice');
const VNDirectService = require('../services/vndirectService');
const TCBSService = require('../services/tcbsService');
const IKISService = require('../services/ikisService');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

exports.getAllPrices = async (req, res, next) => {
  try {
    const { symbol, source, date, limit = 100, offset = 0 } = req.query;

    const query = {};
    if (symbol) query.symbol = symbol.toUpperCase();
    if (source) query.source = source;
    if (date) query.date = new Date(date);

    const prices = await StockPrice.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await StockPrice.countDocuments(query);

    res.json({
      status: 'success',
      data: prices,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPriceBySymbol = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { source, days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const query = {
      symbol: symbol.toUpperCase(),
      date: { $gte: dateFrom }
    };

    if (source) query.source = source;

    const prices = await StockPrice.find(query).sort({ date: -1 });

    res.json({
      status: 'success',
      data: prices
    });
  } catch (error) {
    next(error);
  }
};

exports.triggerManualSync = async (req, res, next) => {
  try {
    const { sources = ['ikis', 'vndirect', 'tcbs'] } = req.body;
    const startTime = Date.now();
    let results = {};

    // Sync iKIS
    if (sources.includes('ikis')) {
      try {
        const prices = await IKISService.getAllPrices();
        // Save to DB
        results.ikis = { synced: prices.length, status: 'success' };
      } catch (error) {
        results.ikis = { synced: 0, status: 'failed', error: error.message };
      }
    }

    // Sync VNDirect
    if (sources.includes('vndirect')) {
      try {
        const symbols = await VNDirectService.getSymbols();
        const today = new Date().toISOString().split('T')[0];
        const prices = await VNDirectService.getPricesByDateRange(
          symbols.map(s => s.code),
          today,
          today
        );
        results.vndirect = { synced: prices.length, status: 'success' };
      } catch (error) {
        results.vndirect = { synced: 0, status: 'failed', error: error.message };
      }
    }

    // Sync TCBS
    if (sources.includes('tcbs')) {
      try {
        const symbols = await VNDirectService.getSymbols();
        const quotes = await TCBSService.getQuotes(symbols.map(s => s.code));
        results.tcbs = { synced: quotes.length, status: 'success' };
      } catch (error) {
        results.tcbs = { synced: 0, status: 'failed', error: error.message };
      }
    }

    const duration = Date.now() - startTime;

    // Log audit trail
    await AuditLog.create({
      action: 'manual_sync_triggered',
      status: 'success',
      details: {
        sources,
        results,
        duration
      },
      timestamp: new Date()
    });

    res.json({
      status: 'success',
      message: 'Manual sync completed',
      data: results,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
};
```

### comparisonController.js

```javascript
// backend/src/controllers/comparisonController.js

const Comparison = require('../models/Comparison');
const logger = require('../utils/logger');

exports.getAllComparisons = async (req, res, next) => {
  try {
    const {
      hasDiscrepancy,
      exchange,
      date,
      limit = 100,
      offset = 0,
      sort = 'symbol',
      order = 'asc'
    } = req.query;

    const query = {};
    if (hasDiscrepancy !== undefined) query.hasDiscrepancy = hasDiscrepancy === 'true';
    if (exchange) query.exchange = exchange;
    if (date) query.date = new Date(date);

    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    const comparisons = await Comparison.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Comparison.countDocuments(query);

    res.json({
      status: 'success',
      data: comparisons,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const { days = 7, dateFrom, dateTo } = req.query;

    let dateQuery = {};
    if (dateFrom && dateTo) {
      dateQuery = {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      };
    } else {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(days));
      dateQuery = { $gte: fromDate };
    }

    const comparisons = await Comparison.find({
      date: dateQuery
    });

    const report = {
      totalComparisons: comparisons.length,
      comparisonsWithDiscrepancies: comparisons.filter(c => c.hasDiscrepancy).length,
      discrepancyRate: (
        (comparisons.filter(c => c.hasDiscrepancy).length / comparisons.length) * 100
      ).toFixed(2) + '%',
      
      byExchange: {},
      bySeverity: {
        critical: 0,
        warning: 0,
        info: 0
      },
      
      trend: []
    };

    // Group by exchange
    comparisons.forEach(comp => {
      if (!report.byExchange[comp.exchange]) {
        report.byExchange[comp.exchange] = {
          total: 0,
          withDiscrepancies: 0
        };
      }
      report.byExchange[comp.exchange].total++;
      if (comp.hasDiscrepancy) {
        report.byExchange[comp.exchange].withDiscrepancies++;
      }
    });

    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

exports.getDiscrepancies = async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const discrepancies = await Comparison.find({
      hasDiscrepancy: true
    })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Comparison.countDocuments({ hasDiscrepancy: true });

    res.json({
      status: 'success',
      data: discrepancies,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    next(error);
  }
};
```

### alertController.js

```javascript
// backend/src/controllers/alertController.js

const Alert = require('../models/Alert');
const logger = require('../utils/logger');

exports.getAllAlerts = async (req, res, next) => {
  try {
    const { status, severity, limit = 50, offset = 0 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Alert.countDocuments(query);

    res.json({
      status: 'success',
      data: alerts,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    next(error);
  }
};

exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy, notes } = req.body;

    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgmentNotes: notes,
        acknowledgedAt: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        status: 'error',
        message: 'Alert not found'
      });
    }

    res.json({
      status: 'success',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

exports.resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolution, notes } = req.body;

    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedBy,
        resolution,
        resolutionNotes: notes,
        resolvedAt: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        status: 'error',
        message: 'Alert not found'
      });
    }

    res.json({
      status: 'success',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Schedulers

### dailySync.js

```javascript
// backend/src/schedulers/dailySync.js

const cron = require('node-cron');
const IKISService = require('../services/ikisService');
const VNDirectService = require('../services/vndirectService');
const TCBSService = require('../services/tcbsService');
const ComparisonService = require('../services/comparisonService');
const AlertService = require('../services/alertService');
const StockPrice = require('../models/StockPrice');
const Comparison = require('../models/Comparison');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class DailySyncScheduler {
  startDailySync() {
    const syncTime = process.env.DAILY_SYNC_TIME || '15:30';
    const [hour, minute] = syncTime.split(':');

    cron.schedule(`${minute} ${hour} * * *`, () => {
      this.runDailySync();
    });

    logger.info(`✅ Daily sync scheduled at ${syncTime}`);
  }

  async runDailySync() {
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];

    try {
      logger.info(`Starting daily sync for ${today}...`);

      // Get all symbols
      const symbols = await VNDirectService.getSymbols();
      logger.info(`Found ${symbols.length} symbols`);

      // Sync iKIS
      logger.info('Syncing iKIS prices...');
      const ikisPrices = await IKISService.getAllPrices();
      await this.savePrices(ikisPrices, 'ikis');
      logger.info(`✅ iKIS: ${ikisPrices.length} prices synced`);

      // Sync VNDirect
      logger.info('Syncing VNDirect prices...');
      const vndPrices = await VNDirectService.getPricesByDateRange(
        symbols.map(s => s.code),
        today,
        today
      );
      await this.savePrices(vndPrices, 'vndirect');
      logger.info(`✅ VNDirect: ${vndPrices.length} prices synced`);

      // Sync TCBS
      logger.info('Syncing TCBS quotes...');
      const tcbsQuotes = await TCBSService.getQuotes(
        symbols.map(s => s.code)
      );
      await this.savePrices(tcbsQuotes, 'tcbs');
      logger.info(`✅ TCBS: ${tcbsQuotes.length} quotes synced`);

      // Run comparisons
      logger.info('Running comparisons...');
      let discrepancyCount = 0;
      for (const symbol of symbols) {
        const comparison = await ComparisonService.compareSymbol(symbol.code, today);
        await comparison.save();
        
        if (comparison.hasDiscrepancy) {
          discrepancyCount++;
          // Create alerts
          await AlertService.createAlertsFromComparison(comparison);
        }
      }
      logger.info(`✅ Comparisons completed. Found ${discrepancyCount} discrepancies`);

      const duration = Date.now() - startTime;

      // Log audit
      await AuditLog.create({
        action: 'price_synced',
        status: 'success',
        details: {
          date: today,
          totalSymbols: symbols.length,
          discrepanciesFound: discrepancyCount,
          duration
        },
        timestamp: new Date()
      });

      logger.info(`✅ Daily sync completed in ${duration}ms`);
    } catch (error) {
      logger.error('❌ Daily sync failed:', error);
      
      await AuditLog.create({
        action: 'price_synced',
        status: 'failed',
        details: {
          error: error.message
        },
        timestamp: new Date()
      });
    }
  }

  async savePrices(prices, source) {
    const transformedPrices = prices.map(price => {
      let transformed;
      if (source === 'ikis') {
        transformed = IKISService.transformPrice(price);
      } else if (source === 'vndirect') {
        transformed = VNDirectService.transformPrice(price);
      } else if (source === 'tcbs') {
        transformed = TCBSService.transformQuote(price);
      }
      return transformed;
    });

    if (transformedPrices.length > 0) {
      await StockPrice.insertMany(transformedPrices, { ordered: false });
    }
  }
}

module.exports = new DailySyncScheduler();
```

---

## Utilities

### logger.js

```javascript
// backend/src/utils/logger.js

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

module.exports = logger;
```

### retryUtil.js

```javascript
// backend/src/utils/retryUtil.js

async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = { retryWithBackoff };
```

---

## Error Handling

### errorHandler.js

```javascript
// backend/src/middleware/errorHandler.js

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    endpoint: req.path,
    method: req.method
  });

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```