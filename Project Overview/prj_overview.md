# 🎯 PROJECT OVERVIEW - iKIS Price Comparison Tool

## Executive Summary

**Project Name:** iKIS Securities Price Comparison Tool

**Objective:** Build an automated daily/real-time price comparison system to detect discrepancies between iKIS price board (Giá Trần/Sàn/Tham Chiếu) and competitor securities firms (VNDirect, TCBS).

**Outcome:** Automated alerts sent to ITBA team to quickly identify and fix pricing errors.

---

## 🎯 Business Context

### Problem Statement
- iKIS securities firm needs to monitor if their displayed prices (ceiling/floor/reference) are accurate
- Manual checking across multiple platforms is time-consuming and error-prone
- Pricing discrepancies can affect customer trust and trading decisions
- Need to detect issues within the same trading day for timely fixes

### Target Users
- **ITBA Channel Team** at iKIS (entire team)
- **Admin/Manager** (oversight & configuration)
- **Support Team** (investigate discrepancies)

### Key Requirements
1. **Daily + Real-time Comparison** of prices
2. **Automatic Alerts** when discrepancies found
3. **Historical Tracking** of all comparisons
4. **Audit Trail** for compliance
5. **Easy Data Export** for reporting

---

## 📊 Data Sources

### 1. iKIS (Internal/Primary)
- **Source:** iKIS internal system (API endpoint TBD)
- **Data:** Ceiling Price, Floor Price, Reference Price
- **Symbols:** All symbols listed on iKIS
- **Update Frequency:** Daily (TBD timing)

### 2. VNDirect (Competitor/Verification)
- **Source:** Public API - finfo-api.vndirect.com.vn
- **Data:** Ceiling Price, Floor Price, Reference Price (basicPrice)
- **Symbols:** All Vietnamese securities
- **Update Frequency:** Daily
- **Authentication:** None required (Public API)
- **API Status:** ✅ Ready to use

### 3. TCBS (Competitor/Verification)
- **Source:** Public API - apipubaws.tcbs.com.vn
- **Data:** Ceiling Price, Floor Price, Reference Price (refPrice)
- **Symbols:** All Vietnamese securities
- **Update Frequency:** Real-time + Daily
- **Authentication:** None required (Public API)
- **API Status:** ✅ Ready to use

---

## 🏗️ Technical Architecture

### Stack Selection
```
Frontend:  React.js (Modern UI, interactive tables)
Backend:   Node.js + Express (Fast, scalable, async operations)
Database:  MongoDB (Flexible schema, handles different price structures)
Scheduler: node-cron (Built-in task scheduling)
```

### Why This Stack?
- **React:** Great for data visualization, real-time updates, filtering/sorting
- **Node.js:** Perfect for I/O heavy operations (API calls, DB queries)
- **MongoDB:** Flexible schema (different APIs return different fields)
- **Docker:** Easy deployment & environment consistency

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│        FRONTEND (React.js)              │
│  ┌─────────────────────────────────┐   │
│  │ Dashboard | Table | Alerts      │   │
│  │ History | Export | Settings     │   │
│  └─────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │ HTTP/REST
┌──────────────────┴──────────────────────┐
│      BACKEND (Node.js + Express)        │
│  ┌────────────────────────────────────┐ │
│  │ API Routes                         │ │
│  │ ├─ GET /api/prices                 │ │
│  │ ├─ GET /api/comparisons            │ │
│  │ ├─ GET /api/alerts                 │ │
│  │ ├─ GET /api/history                │ │
│  │ └─ POST /api/sync (manual trigger) │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ Services (Business Logic)          │ │
│  │ ├─ iKISService                     │ │
│  │ ├─ VNDirectService                 │ │
│  │ ├─ TCBSService                     │ │
│  │ ├─ ComparisonService               │ │
│  │ └─ AlertService                    │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ Schedulers (Cron Jobs)             │ │
│  │ ├─ Daily Sync (3:30 PM)            │ │
│  │ ├─ Real-time Sync (Polling)        │ │
│  │ └─ Alert Checker                   │ │
│  └────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │ MongoDB Driver
┌──────────────────┴──────────────────────┐
│      DATABASE (MongoDB)                 │
│  ┌────────────────────────────────────┐ │
│  │ Collections:                       │ │
│  │ ├─ stock_prices                    │ │
│  │ ├─ comparisons                     │ │
│  │ ├─ alerts                          │ │
│  │ ├─ audit_logs                      │ │
│  │ └─ symbols                         │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         ▲            ▲            ▲
         │            │            │
    ┌────┴──┐    ┌────┴──┐    ┌───┴──┐
    │ iKIS  │    │ VND   │    │ TCBS │
    │ API   │    │ API   │    │ API  │
    └───────┘    └───────┘    └──────┘
    (Internal)  (Public)     (Public)
```

---

## 🗄️ Database Schema (MongoDB)

### Collection: stock_prices
```javascript
{
  _id: ObjectId,
  symbol: "ACB",
  date: ISODate("2024-06-23"),
  source: "ikis|vndirect|tcbs", // Which source
  exchange: "HOSE|HNX|UPCOM",
  
  // Price data
  ceilingPrice: 33700,
  floorPrice: 29300,
  referencePrice: 31500,
  
  // Additional OHLCV data (if available)
  openPrice: 31300,
  highPrice: 31700,
  lowPrice: 31000,
  closePrice: 31600,
  volume: 1234567,
  value: 38800000000,
  
  // Metadata
  lastUpdated: ISODate(),
  syncedAt: ISODate(),
  rawData: {} // Store raw API response for debugging
}
```

### Collection: comparisons
```javascript
{
  _id: ObjectId,
  symbol: "ACB",
  date: ISODate("2024-06-23"),
  exchange: "HOSE",
  
  // Source 1: iKIS
  ikis: {
    ceilingPrice: 33700,
    floorPrice: 29300,
    referencePrice: 31500
  },
  
  // Source 2: VNDirect
  vndirect: {
    ceilingPrice: 33700,
    floorPrice: 29300,
    referencePrice: 31500
  },
  
  // Source 3: TCBS
  tcbs: {
    ceilingPrice: 33750, // ❌ MISMATCH!
    floorPrice: 29300,
    referencePrice: 31500
  },
  
  // Comparison results
  discrepancies: [
    {
      field: "ceilingPrice",
      values: {
        ikis: 33700,
        vndirect: 33700,
        tcbs: 33750
      },
      hasDiscrepancy: true,
      maxDifference: 50,
      maxDifferencePercent: 0.15
    }
  ],
  
  hasDiscrepancy: true,
  discrepancyCount: 1,
  comparisonStatus: "completed|pending|failed",
  comparedAt: ISODate()
}
```

### Collection: alerts
```javascript
{
  _id: ObjectId,
  symbol: "ACB",
  date: ISODate("2024-06-23"),
  discrepancyType: "ceiling_price|floor_price|reference_price",
  
  // Alert details
  severity: "critical|warning|info", // Critical >5%, Warning 1-5%, Info <1%
  differenceAmount: 50,
  differencePercent: 0.15,
  
  // Values involved
  sources: {
    ikis: 33700,
    vndirect: 33700,
    tcbs: 33750
  },
  
  // Alert metadata
  status: "open|acknowledged|resolved",
  createdAt: ISODate(),
  acknowledgedBy: "user@ikis.com",
  acknowledgedAt: ISODate(),
  resolvedAt: ISODate(),
  resolution: "Manual fix applied|Data error from TCBS",
  
  // Notification status
  notified: true,
  notificationChannels: ["in_app", "email"],
  notifiedAt: ISODate()
}
```

### Collection: audit_logs
```javascript
{
  _id: ObjectId,
  action: "price_synced|comparison_completed|alert_created|alert_resolved",
  timestamp: ISODate(),
  
  // User info (if applicable)
  userId: "user@ikis.com",
  userName: "John Doe",
  
  // Details
  details: {
    symbol: "ACB",
    source: "vndirect",
    dataCount: 3000,
    successCount: 2998,
    failureCount: 2,
    duration: 45000 // ms
  },
  
  // Status
  status: "success|partial|failed",
  errorMessage: null,
  
  // Context
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
}
```

### Collection: symbols
```javascript
{
  _id: ObjectId,
  symbol: "ACB",
  name: "Ngân hàng TMCP Á Châu",
  nameEn: "Asia Commercial Bank",
  exchange: "HOSE",
  industry: "Banking",
  
  // Status
  isListed: true,
  isActive: true,
  
  // Metadata
  listedDate: ISODate("2006-11-30"),
  lastSyncedAt: ISODate()
}
```

---

## 🔄 Data Flow

### Daily Sync Flow (Batch Mode)

```
1. Scheduler Triggered (3:30 PM daily)
   ↓
2. Fetch iKIS Prices (all symbols)
   ├─ Call iKIS API
   ├─ Save to DB (collection: stock_prices, source: "ikis")
   └─ Handle errors/retries
   ↓
3. Fetch VNDirect Prices (all symbols)
   ├─ Call VNDirect API
   ├─ Save to DB (collection: stock_prices, source: "vndirect")
   └─ Handle errors/retries
   ↓
4. Fetch TCBS Prices (all symbols)
   ├─ Call TCBS API
   ├─ Save to DB (collection: stock_prices, source: "tcbs")
   └─ Handle errors/retries
   ↓
5. Run Comparison Logic
   ├─ For each symbol:
   │  ├─ Get iKIS price
   │  ├─ Get VNDirect price
   │  ├─ Get TCBS price
   │  ├─ Compare ceiling/floor/reference
   │  ├─ Detect discrepancies
   │  └─ Save results to DB (collection: comparisons)
   └─ Log audit trail
   ↓
6. Generate Alerts
   ├─ Query comparisons with discrepancies
   ├─ Create alert records (collection: alerts)
   ├─ Classify severity (critical/warning/info)
   └─ Send notifications (email/Slack/in-app)
   ↓
7. Report to ITBA Team
   ├─ Email summary
   ├─ Slack notification
   └─ Dashboard updates
```

### Real-time Sync Flow (Optional)

```
1. Polling Scheduler (Every 1 hour or configurable)
   ↓
2. Fetch latest prices from VNDirect & TCBS
   ↓
3. Quick comparison against iKIS cached data
   ↓
4. If discrepancy found → Create immediate alert
   ↓
5. Notify ITBA team in real-time
```

---

## 📋 API Endpoints Specification

### Prices
```
GET /api/prices
  - Fetch all latest prices
  - Query: ?symbol=ACB&source=ikis&date=2024-06-23
  - Response: Array of price records

GET /api/prices/:symbol
  - Fetch price history for a symbol
  - Query: ?days=30&source=all
  - Response: Historical price data

POST /api/prices/sync (Admin only)
  - Manually trigger price sync
  - Body: { symbol?: string, sources: ['ikis','vndirect','tcbs'] }
  - Response: { success: true, synced: 3000, failed: 5 }
```

### Comparisons
```
GET /api/comparisons
  - Fetch all comparisons
  - Query: ?date=2024-06-23&hasDiscrepancy=true&limit=100
  - Response: Array of comparison records

GET /api/comparisons/:symbol
  - Fetch comparison history for a symbol
  - Query: ?days=30
  - Response: Historical comparisons

GET /api/comparisons/report
  - Generate summary report
  - Query: ?dateFrom=2024-06-01&dateTo=2024-06-23
  - Response: { totalComparisons, discrepancies, bySymbol, bySeverity }
```

### Alerts
```
GET /api/alerts
  - Fetch all alerts
  - Query: ?status=open&severity=critical&limit=50
  - Response: Array of alert records

GET /api/alerts/:id
  - Fetch alert details
  - Response: Single alert with full context

PUT /api/alerts/:id/acknowledge
  - Mark alert as acknowledged
  - Body: { acknowledgedBy: "user@ikis.com", notes: "..." }
  - Response: Updated alert

PUT /api/alerts/:id/resolve
  - Mark alert as resolved
  - Body: { resolution: "Manual fix applied", resolvedBy: "user@ikis.com" }
  - Response: Updated alert
```

### History & Audit
```
GET /api/audit-logs
  - Fetch audit logs
  - Query: ?action=price_synced&days=7&limit=100
  - Response: Array of audit log records

GET /api/history/:symbol
  - Fetch full history for a symbol
  - Query: ?days=30
  - Response: All comparisons, alerts, and changes for symbol
```

### System
```
GET /api/health
  - Health check
  - Response: { status: "healthy", uptime: 3600, lastSync: ISODate }

GET /api/stats
  - System statistics
  - Response: { symbolsTracked: 3000, lastSyncTime: 45000ms, alerts: 12 }
```

---

## 🎨 Frontend Pages

### 1. Dashboard (Home)
**Purpose:** Quick overview of system health and current status

**Components:**
- Stats cards (Total symbols, Discrepancies today, Open alerts)
- Chart: Discrepancies trend (last 7 days)
- Chart: Alerts by severity
- Last sync status & timing
- Quick actions: Manual sync, Export report

**Data Needed:**
- GET /api/stats
- GET /api/comparisons/report?days=7
- GET /api/alerts?status=open

---

### 2. Comparison Table (Main page)
**Purpose:** View all price comparisons in detail

**Table Columns:**
- Symbol (searchable)
- Exchange
- iKIS Ceiling | VNDirect Ceiling | TCBS Ceiling | Discrepancy
- iKIS Floor | VNDirect Floor | TCBS Floor | Discrepancy
- iKIS Ref | VNDirect Ref | TCBS Ref | Discrepancy
- Status (✅ Match / ❌ Mismatch)
- Last Updated

**Features:**
- Sorting (by symbol, discrepancy, date)
- Filtering (by exchange, status, date range)
- Search by symbol
- Pagination (20/50/100 per page)
- Export to CSV/Excel
- Drill-down to details

**Data Needed:**
- GET /api/comparisons?limit=100&offset=0&hasDiscrepancy=true

---

### 3. Alerts Page
**Purpose:** Monitor all active alerts

**List Components:**
- Alert card for each item showing:
  - Symbol
  - Severity (Red/Yellow/Blue badge)
  - Discrepancy details (field, values, difference %)
  - Created time
  - Status (Open / Acknowledged / Resolved)
  - Action buttons (Acknowledge, Resolve, Details)

**Filters:**
- Severity (Critical, Warning, Info)
- Status (Open, Acknowledged, Resolved)
- Date range
- Search by symbol

**Data Needed:**
- GET /api/alerts?status=open&limit=100

---

### 4. History & Audit Log
**Purpose:** Full audit trail for compliance

**Features:**
- Filterable log entries showing:
  - Timestamp
  - Action (price_synced, comparison_completed, alert_created, etc.)
  - Symbol / Scope
  - Status (success, partial, failed)
  - Details (item count, duration, errors)
  - User (if applicable)

**Filters:**
- Action type
- Status
- Date range
- User

**Data Needed:**
- GET /api/audit-logs?limit=100&offset=0

---

### 5. Settings Page (Optional - Phase 2)
**Purpose:** Configure alerts & system behavior

**Options:**
- Severity thresholds (critical %, warning %)
- Alert channels (Email, Slack, In-app)
- Notification recipients
- Sync schedule (daily time, real-time polling interval)
- Data retention period

---

## ⚙️ Configuration & Environment

### .env File Structure
```
# Server
NODE_ENV=development
PORT=5000
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb://localhost:27017/ikis-prices
MONGODB_USER=admin
MONGODB_PASSWORD=secret

# APIs
IKIS_API_URL=https://api.ikis.com.vn/...
IKIS_API_KEY=xxx
IKIS_API_SECRET=xxx

VNDIRECT_API_URL=https://finfo-api.vndirect.com.vn
VNDIRECT_API_TIMEOUT=10000

TCBS_API_URL=https://apipubaws.tcbs.com.vn
TCBS_API_TIMEOUT=10000

# Schedulers
DAILY_SYNC_TIME=15:30
DAILY_SYNC_ENABLED=true
REALTIME_SYNC_ENABLED=false
REALTIME_SYNC_INTERVAL=3600000 # 1 hour in ms

# Alerts
ALERT_EMAIL_RECIPIENTS=itba@ikis.com
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/...
ALERT_CRITICAL_THRESHOLD=0.05 # 5%
ALERT_WARNING_THRESHOLD=0.01 # 1%

# Data Retention
DATA_RETENTION_DAYS=90

# CORS & Security
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=secret_key
```

---

## 📅 Development Timeline

| Phase | Days | Tasks | Deliverables |
|-------|------|-------|--------------|
| **Setup** | 1-2 | Project init, DB schema, folder structure | Project scaffold ready |
| **Backend** | 2-4 | APIs, services, schedulers, validation | All endpoints working |
| **Frontend** | 4-6 | Dashboard, tables, alerts, history | All pages functional |
| **Testing** | 6-7 | Bug fixes, optimization, documentation | Deployment ready |

---

## 🚀 Success Criteria

✅ After 1 week, the tool should:

1. Fetch prices from iKIS, VNDirect, TCBS automatically
2. Compare ceiling/floor/reference prices daily (3:30 PM)
3. Detect ALL discrepancies (no threshold filtering)
4. Create alerts for every mismatch found
5. Send notifications to ITBA team
6. Display results in searchable/sortable dashboard
7. Export data to CSV/Excel
8. Maintain complete audit trail
9. Handle ~3000 symbols
10. Respond to requests in <2 seconds
11. Run 24/7 with auto-restart on crashes
12. Easy manual sync trigger for testing

---

## 📞 Support & Maintenance

### Monitoring
- Daily sync execution logs
- API response times
- Database query performance
- Alert generation rate
- Error/failure tracking

### Maintenance Windows
- None (24/7 operation)
- Updates during off-hours (if needed)
- Database backups daily

### Escalation Path
1. System detects issue → Log entry
2. Admin notified → Check logs
3. Issue resolution → Update audit log