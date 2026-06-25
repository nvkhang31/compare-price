# 🗄️ DATABASE SCHEMA - MongoDB with Mongoose

## Overview

This document defines all MongoDB collections and Mongoose schemas for the iKIS Price Comparison Tool.

---

## 1. StockPrice Collection

**Purpose:** Store price data from all three sources (iKIS, VNDirect, TCBS)

### Schema Definition

```javascript
// backend/src/models/StockPrice.js

const mongoose = require('mongoose');

const stockPriceSchema = new mongoose.Schema({
  // Identifiers
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  
  // Date & Time
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Source of data
  source: {
    type: String,
    enum: ['ikis', 'vndirect', 'tcbs'],
    required: true,
    index: true
  },
  
  // Exchange
  exchange: {
    type: String,
    enum: ['HOSE', 'HNX', 'UPCOM', 'GB', 'VNF', 'HNXBOND'],
    index: true
  },
  
  // Price Data - Main (Ceiling, Floor, Reference)
  ceilingPrice: {
    type: Number,
    required: function() { return this.source !== undefined; }
  },
  
  floorPrice: {
    type: Number,
    required: function() { return this.source !== undefined; }
  },
  
  referencePrice: {
    type: Number,
    required: function() { return this.source !== undefined; }
  },
  
  // OHLCV Data (optional, may not be available from all sources)
  openPrice: Number,
  highPrice: Number,
  lowPrice: Number,
  closePrice: Number,
  
  // Volume & Value
  volume: {
    type: Number,
    default: 0
  },
  
  value: {
    type: Number,
    default: 0
  },
  
  // Additional metrics
  change: Number,
  changePercent: Number,
  
  // Bid/Ask (if available)
  bidPrice: Number,
  bidVolume: Number,
  offerPrice: Number,
  offerVolume: Number,
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  syncedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Raw API response (for debugging/troubleshooting)
  rawData: mongoose.Schema.Types.Mixed
  
}, {
  timestamps: true,
  collection: 'stock_prices'
});

// Indexes for optimal query performance
stockPriceSchema.index({ symbol: 1, date: 1, source: 1 });
stockPriceSchema.index({ symbol: 1, date: -1 });
stockPriceSchema.index({ date: 1, source: 1 });
stockPriceSchema.index({ syncedAt: -1 });

// Text index for searching
stockPriceSchema.index({ symbol: 'text' });

module.exports = mongoose.model('StockPrice', stockPriceSchema);
```

### Sample Document

```javascript
{
  "_id": ObjectId("6674e1a2c5f8b2a1e2c3d4f5"),
  "symbol": "ACB",
  "date": ISODate("2024-06-23"),
  "source": "vndirect",
  "exchange": "HOSE",
  "ceilingPrice": 33700,
  "floorPrice": 29300,
  "referencePrice": 31500,
  "openPrice": 31300,
  "highPrice": 31700,
  "lowPrice": 31000,
  "closePrice": 31600,
  "volume": 1234567,
  "value": 38800000000,
  "change": 100,
  "changePercent": 0.32,
  "lastUpdated": ISODate("2024-06-23T15:30:00Z"),
  "syncedAt": ISODate("2024-06-23T15:35:22Z"),
  "createdAt": ISODate("2024-06-23T15:35:22Z"),
  "updatedAt": ISODate("2024-06-23T15:35:22Z")
}
```

---

## 2. Comparison Collection

**Purpose:** Store comparison results between all sources for each symbol

### Schema Definition

```javascript
// backend/src/models/Comparison.js

const mongoose = require('mongoose');

const comparisonSchema = new mongoose.Schema({
  // Identifiers
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  exchange: {
    type: String,
    enum: ['HOSE', 'HNX', 'UPCOM'],
    index: true
  },
  
  // Source prices
  ikis: {
    ceilingPrice: Number,
    floorPrice: Number,
    referencePrice: Number,
    synced: Boolean,
    syncedAt: Date
  },
  
  vndirect: {
    ceilingPrice: Number,
    floorPrice: Number,
    referencePrice: Number,
    synced: Boolean,
    syncedAt: Date
  },
  
  tcbs: {
    ceilingPrice: Number,
    floorPrice: Number,
    referencePrice: Number,
    synced: Boolean,
    syncedAt: Date
  },
  
  // Detailed discrepancy analysis
  discrepancies: [{
    field: {
      type: String,
      enum: ['ceilingPrice', 'floorPrice', 'referencePrice']
    },
    
    values: {
      ikis: Number,
      vndirect: Number,
      tcbs: Number
    },
    
    hasDiscrepancy: Boolean,
    maxDifference: Number,        // Absolute difference
    maxDifferencePercent: Number,  // Percentage difference
    minValue: Number,
    maxValue: Number,
    
    // Which sources differ
    outliers: [String]  // ['tcbs'] if TCBS value is different
  }],
  
  // Summary
  hasDiscrepancy: {
    type: Boolean,
    index: true,
    default: false
  },
  
  discrepancyCount: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Status
  comparisonStatus: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed',
    index: true
  },
  
  statusMessage: String,
  
  // Metadata
  comparedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
  
}, {
  timestamps: true,
  collection: 'comparisons'
});

// Indexes
comparisonSchema.index({ symbol: 1, date: 1 });
comparisonSchema.index({ symbol: 1, date: -1 });
comparisonSchema.index({ date: 1, hasDiscrepancy: 1 });
comparisonSchema.index({ hasDiscrepancy: 1, date: -1 });
comparisonSchema.index({ comparedAt: -1 });

module.exports = mongoose.model('Comparison', comparisonSchema);
```

### Sample Document

```javascript
{
  "_id": ObjectId("6674e1a2c5f8b2a1e2c3d4f6"),
  "symbol": "ACB",
  "date": ISODate("2024-06-23"),
  "exchange": "HOSE",
  
  "ikis": {
    "ceilingPrice": 33700,
    "floorPrice": 29300,
    "referencePrice": 31500,
    "synced": true,
    "syncedAt": ISODate("2024-06-23T15:35:00Z")
  },
  
  "vndirect": {
    "ceilingPrice": 33700,
    "floorPrice": 29300,
    "referencePrice": 31500,
    "synced": true,
    "syncedAt": ISODate("2024-06-23T15:35:10Z")
  },
  
  "tcbs": {
    "ceilingPrice": 33750,  // ❌ MISMATCH!
    "floorPrice": 29300,
    "referencePrice": 31500,
    "synced": true,
    "syncedAt": ISODate("2024-06-23T15:35:15Z")
  },
  
  "discrepancies": [
    {
      "field": "ceilingPrice",
      "values": {
        "ikis": 33700,
        "vndirect": 33700,
        "tcbs": 33750
      },
      "hasDiscrepancy": true,
      "maxDifference": 50,
      "maxDifferencePercent": 0.15,
      "minValue": 33700,
      "maxValue": 33750,
      "outliers": ["tcbs"]
    },
    {
      "field": "floorPrice",
      "values": {
        "ikis": 29300,
        "vndirect": 29300,
        "tcbs": 29300
      },
      "hasDiscrepancy": false,
      "maxDifference": 0,
      "maxDifferencePercent": 0
    },
    {
      "field": "referencePrice",
      "values": {
        "ikis": 31500,
        "vndirect": 31500,
        "tcbs": 31500
      },
      "hasDiscrepancy": false
    }
  ],
  
  "hasDiscrepancy": true,
  "discrepancyCount": 1,
  "comparisonStatus": "completed",
  "comparedAt": ISODate("2024-06-23T15:36:00Z"),
  "createdAt": ISODate("2024-06-23T15:36:00Z"),
  "updatedAt": ISODate("2024-06-23T15:36:00Z")
}
```

---

## 3. Alert Collection

**Purpose:** Track alerts generated from discrepancies

### Schema Definition

```javascript
// backend/src/models/Alert.js

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  // Reference to comparison
  comparisonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comparison',
    index: true
  },
  
  // Alert identifiers
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Discrepancy details
  discrepancyType: {
    type: String,
    enum: ['ceilingPrice', 'floorPrice', 'referencePrice'],
    required: true
  },
  
  exchange: String,
  
  // Alert severity (based on percentage difference)
  severity: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true,
    index: true
  },
  
  // Threshold info
  severityThresholds: {
    critical: 0.05,   // >5%
    warning: 0.01,    // 1-5%
    info: 0           // <1%
  },
  
  // Discrepancy metrics
  differenceAmount: Number,
  differencePercent: Number,
  
  // Actual values
  sources: {
    ikis: Number,
    vndirect: Number,
    tcbs: Number
  },
  
  outlierSource: String,  // Which source is the outlier
  
  // Alert status & lifecycle
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'resolved'],
    default: 'open',
    index: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Acknowledgment
  acknowledgedBy: String,
  acknowledgedAt: Date,
  acknowledgmentNotes: String,
  
  // Resolution
  resolvedBy: String,
  resolvedAt: Date,
  resolutionNotes: String,
  resolution: {
    type: String,
    enum: [
      'manual_fix_applied',
      'data_error_from_source',
      'system_issue',
      'false_positive',
      'pending_investigation',
      'other'
    ]
  },
  
  // Notification tracking
  notified: {
    type: Boolean,
    default: false
  },
  
  notificationChannels: [{
    type: String,
    enum: ['in_app', 'email', 'slack']
  }],
  
  notifiedAt: Date,
  notificationStatus: {
    in_app: Boolean,
    email: Boolean,
    slack: Boolean
  },
  
  // Escalation
  escalated: {
    type: Boolean,
    default: false
  },
  
  escalatedTo: String,
  escalationReason: String,
  escalationTime: Date
  
}, {
  timestamps: true,
  collection: 'alerts'
});

// Indexes
alertSchema.index({ symbol: 1, date: -1 });
alertSchema.index({ status: 1, severity: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ severity: 1, status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
```

### Sample Document

```javascript
{
  "_id": ObjectId("6674e1a2c5f8b2a1e2c3d4f7"),
  "comparisonId": ObjectId("6674e1a2c5f8b2a1e2c3d4f6"),
  "symbol": "ACB",
  "date": ISODate("2024-06-23"),
  "discrepancyType": "ceilingPrice",
  "exchange": "HOSE",
  
  "severity": "warning",  // 0.15% < 1%
  "severityThresholds": {
    "critical": 0.05,
    "warning": 0.01,
    "info": 0
  },
  
  "differenceAmount": 50,
  "differencePercent": 0.15,
  
  "sources": {
    "ikis": 33700,
    "vndirect": 33700,
    "tcbs": 33750
  },
  
  "outlierSource": "tcbs",
  
  "status": "open",
  "createdAt": ISODate("2024-06-23T15:36:05Z"),
  "acknowledgedBy": null,
  "acknowledgedAt": null,
  
  "notified": true,
  "notificationChannels": ["in_app", "email"],
  "notifiedAt": ISODate("2024-06-23T15:36:10Z"),
  "notificationStatus": {
    "in_app": true,
    "email": true,
    "slack": false
  },
  
  "escalated": false,
  "updatedAt": ISODate("2024-06-23T15:36:10Z")
}
```

---

## 4. AuditLog Collection

**Purpose:** Track all system actions for audit & compliance

### Schema Definition

```javascript
// backend/src/models/AuditLog.js

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Action type
  action: {
    type: String,
    enum: [
      'price_synced',
      'comparison_completed',
      'alert_created',
      'alert_acknowledged',
      'alert_resolved',
      'manual_sync_triggered',
      'data_exported',
      'system_error',
      'config_changed'
    ],
    required: true,
    index: true
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // User information (if applicable)
  userId: String,
  userName: String,
  userEmail: String,
  
  // Status
  status: {
    type: String,
    enum: ['success', 'partial', 'failed'],
    default: 'success',
    index: true
  },
  
  errorMessage: String,
  errorStack: String,
  
  // Action details (flexible, varies by action type)
  details: {
    // For price_synced
    source: String,           // ikis, vndirect, tcbs
    symbolsCount: Number,
    successCount: Number,
    failureCount: Number,
    duration: Number,         // milliseconds
    
    // For comparison_completed
    date: Date,
    comparisonsCompleted: Number,
    discrepanciesFound: Number,
    
    // For alert operations
    symbol: String,
    alertId: mongoose.Schema.Types.ObjectId,
    severity: String,
    
    // For exports
    format: String,           // csv, excel, pdf
    exportedRecords: Number,
    
    // Generic
    message: String,
    context: mongoose.Schema.Types.Mixed
  },
  
  // Additional context
  ipAddress: String,
  userAgent: String,
  endpoint: String,
  method: String,
  
  // Performance metrics
  duration: Number,          // How long the action took (ms)
  resourceUsage: {
    memory: Number,
    cpu: Number
  }
  
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

// TTL Index: Auto-delete logs older than 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
```

### Sample Document

```javascript
{
  "_id": ObjectId("6674e1a2c5f8b2a1e2c3d4f8"),
  "action": "price_synced",
  "timestamp": ISODate("2024-06-23T15:35:22Z"),
  "userId": null,
  "status": "success",
  
  "details": {
    "source": "vndirect",
    "symbolsCount": 3000,
    "successCount": 2998,
    "failureCount": 2,
    "duration": 45000,
    "failedSymbols": ["XYZ", "ABC"]
  },
  
  "duration": 45000,
  "createdAt": ISODate("2024-06-23T15:35:22Z"),
  "updatedAt": ISODate("2024-06-23T15:35:22Z")
}
```

---

## 5. Symbol Collection (Reference)

**Purpose:** Maintain a master list of all symbols

### Schema Definition

```javascript
// backend/src/models/Symbol.js

const mongoose = require('mongoose');

const symbolSchema = new mongoose.Schema({
  // Basic info
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  
  name: String,
  nameEn: String,
  
  // Classification
  exchange: {
    type: String,
    enum: ['HOSE', 'HNX', 'UPCOM'],
    index: true
  },
  
  type: {
    type: String,
    enum: ['STOCK', 'FUND', 'BOND', 'WARRANT', 'FUTURES', 'INDEX'],
    index: true
  },
  
  industry: String,
  sector: String,
  
  // Status
  isListed: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Dates
  listedDate: Date,
  delistedDate: Date,
  
  // Tracking
  lastPriceSyncedAt: Date,
  lastComparisonAt: Date,
  
  // Statistics
  alertsCount: {
    type: Number,
    default: 0
  },
  
  lastAlertAt: Date
  
}, {
  timestamps: true,
  collection: 'symbols'
});

// Indexes
symbolSchema.index({ symbol: 1 });
symbolSchema.index({ exchange: 1, isActive: 1 });
symbolSchema.index({ isActive: 1, type: 1 });

module.exports = mongoose.model('Symbol', symbolSchema);
```

---

## 6. Database Connection & Initialization

```javascript
// backend/src/config/database.js

const mongoose = require('mongoose');

class DatabaseConnection {
  static async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ikis-prices';
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });
      
      console.log('✅ MongoDB connected');
      
      // Create indexes
      await this.createIndexes();
      
      return mongoose.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  static async createIndexes() {
    const StockPrice = require('../models/StockPrice');
    const Comparison = require('../models/Comparison');
    const Alert = require('../models/Alert');
    const AuditLog = require('../models/AuditLog');
    const Symbol = require('../models/Symbol');
    
    await StockPrice.collection.createIndex({ symbol: 1, date: 1, source: 1 });
    await Comparison.collection.createIndex({ symbol: 1, date: 1 });
    await Alert.collection.createIndex({ symbol: 1, date: -1 });
    await AuditLog.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
    await Symbol.collection.createIndex({ exchange: 1, isActive: 1 });
    
    console.log('✅ Indexes created');
  }

  static async disconnect() {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

module.exports = DatabaseConnection;
```

---

## 7. Querying Examples

### Get latest prices for a symbol

```javascript
const StockPrice = require('./models/StockPrice');

const latestPrices = await StockPrice.find({
  symbol: 'ACB',
  date: new Date('2024-06-23')
}).select('symbol source ceilingPrice floorPrice referencePrice');

console.log(latestPrices);
```

### Get comparisons with discrepancies

```javascript
const Comparison = require('./models/Comparison');

const discrepancies = await Comparison.find({
  hasDiscrepancy: true,
  date: new Date('2024-06-23')
}).sort({ discrepancyCount: -1 });

console.log(`Found ${discrepancies.length} symbols with discrepancies`);
```

### Get open alerts

```javascript
const Alert = require('./models/Alert');

const openAlerts = await Alert.find({
  status: 'open'
}).sort({ severity: 1, createdAt: -1 }).limit(20);

console.log(`${openAlerts.length} open alerts`);
```

### Get audit log for a day

```javascript
const AuditLog = require('./models/AuditLog');

const logs = await AuditLog.find({
  timestamp: {
    $gte: new Date('2024-06-23T00:00:00Z'),
    $lt: new Date('2024-06-24T00:00:00Z')
  }
}).sort({ timestamp: -1 });

console.log(`${logs.length} audit log entries for 2024-06-23`);
```