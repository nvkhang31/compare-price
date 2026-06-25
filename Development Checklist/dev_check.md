# ✅ DEVELOPMENT CHECKLIST & QUICK START GUIDE

## 📋 Pre-Development Checklist

### Information Gathering (REQUIRED BEFORE CODING)

- [x] **KIS WTS API Details**
  - Static Data URL: `https://trading.kisvn.vn/files/resources/symbol_static_data.json?v=89-23b1f8f`
  - Realtime URL: `https://trading.kisvn.vn/rest/api/v2/market/symbol/latest?symbolList={symbols}`
  - Authentication Method: None required (Public API)
  - Key fields: `ce` (Trần), `fl` (Sàn), `re` (Tham Chiếu), `s` (symbol), `m` (exchange)
  - ⚠️ Note: Version param `?v=` may change on WTS redeploy — store in `.env`

- [ ] **Project Configuration**
  - Deployment Environment: ___________
  - MongoDB Connection String: ___________
  - Frontend URL (for CORS): ___________
  - Email Recipients for Alerts: ___________
  - Slack Webhook URL (optional): ___________

- [ ] **Business Requirements Confirmation**
  - Daily Sync Time (HH:MM): ___________
  - Alert Severity Thresholds:
    - Critical: ___________% 
    - Warning: ___________% 
    - Info: ___________%
  - Data Retention Period: ___________ days
  - Required Symbols Count: ___________

---

## 🚀 Quick Start Guide

### Step 1: Clone & Setup (5 minutes)

```bash
# Clone repository
git clone <repo-url>
cd ikis-price-comparison

# Backend setup
cd backend
npm install
cp .env.example .env
# EDIT .env with your configuration

# Frontend setup (new terminal)
cd ../frontend
npm install
cp .env.example .env
# EDIT .env with API_URL
```

### Step 2: Create .env Files

**backend/.env:**
```
NODE_ENV=development
PORT=5000
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb://localhost:27017/ikis-prices

# APIs
IKIS_API_URL=https://api.ikis.com.vn/...
IKIS_API_KEY=your_key_here

VNDIRECT_API_URL=https://finfo-api.vndirect.com.vn
TCBS_API_URL=https://apipubaws.tcbs.com.vn

# Schedulers
DAILY_SYNC_TIME=15:30
DAILY_SYNC_ENABLED=true

# Alerts
ALERT_CRITICAL_THRESHOLD=0.05
ALERT_WARNING_THRESHOLD=0.01
ALERT_EMAIL_RECIPIENTS=team@ikis.com

# CORS
CORS_ORIGIN=http://localhost:3000
```

**frontend/.env:**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

### Step 3: Start Services

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Backend
cd backend
npm run dev  # Uses nodemon for auto-reload

# Terminal 3: Start Frontend
cd frontend
npm start
```

### Step 4: Verify Installation

```bash
# Check backend health
curl http://localhost:5000/api/health

# Access frontend
open http://localhost:3000
```

---

## 📅 Development Phases

### Phase 1: Setup & Database (Day 1)

**Checklist:**
- [ ] Create MongoDB collections & indexes
- [ ] Set up Node.js project structure
- [ ] Create React project structure
- [ ] Configure environment variables
- [ ] Test database connection
- [ ] Test Axios/API client setup

**Deliverables:**
- Project scaffold complete
- All files & folders created
- Package.json dependencies installed

**Commands:**
```bash
# Backend
npm install

# Frontend
npm install
```

---

### Phase 2: Backend - Core APIs (Days 2-3)

**Checklist:**
- [ ] Implement VNDirect service (test with real API)
- [ ] Implement TCBS service (test with real API)
- [ ] Implement iKIS service (once API details provided)
- [ ] Create ComparisonService
- [ ] Create AlertService
- [ ] Implement price sync endpoints
- [ ] Implement comparison endpoints
- [ ] Implement alert endpoints
- [ ] Test all endpoints with Postman

**Test Commands:**
```bash
# Test VNDirect API
curl "https://finfo-api.vndirect.com.vn/stocks" | jq

# Test TCBS API
curl "https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/ACB/overview" | jq

# Test backend endpoint
curl http://localhost:5000/api/health
```

---

### Phase 3: Backend - Schedulers & Alerts (Days 3-4)

**Checklist:**
- [ ] Implement daily sync scheduler
- [ ] Implement real-time sync scheduler (optional)
- [ ] Implement alert creation logic
- [ ] Implement alert notification service
- [ ] Create audit logging
- [ ] Test schedulers with manual triggers
- [ ] Test alert generation

**Test:**
```bash
# Manual trigger sync
curl -X POST http://localhost:5000/api/prices/sync

# Check alerts
curl http://localhost:5000/api/alerts?status=open
```

---

### Phase 4: Frontend - Dashboard & Tables (Days 4-6)

**Checklist:**
- [ ] Create Dashboard page with stats cards
- [ ] Create Comparison Table component
- [ ] Implement sorting & filtering
- [ ] Create Alerts page & list
- [ ] Create History/Audit page
- [ ] Implement search functionality
- [ ] Add loading states & error handling
- [ ] Style with Tailwind CSS
- [ ] Test responsive design

---

### Phase 5: Testing & Polish (Days 6-7)

**Checklist:**
- [ ] Unit test critical services
- [ ] Integration test API endpoints
- [ ] E2E test main workflows
- [ ] Fix bugs & edge cases
- [ ] Optimize performance
- [ ] Clean up code & add comments
- [ ] Update README & documentation
- [ ] Test deployment configuration

---

## 🧪 Testing Checklist

### Manual Testing

#### Backend API Testing (Postman/cURL)

```bash
# Test Prices
curl http://localhost:5000/api/prices
curl http://localhost:5000/api/prices/ACB
curl -X POST http://localhost:5000/api/prices/sync

# Test Comparisons
curl http://localhost:5000/api/comparisons
curl http://localhost:5000/api/comparisons/ACB
curl http://localhost:5000/api/comparisons/report/summary

# Test Alerts
curl http://localhost:5000/api/alerts
curl http://localhost:5000/api/alerts?status=open
curl http://localhost:5000/api/alerts?severity=critical

# Test Health
curl http://localhost:5000/api/health
```

#### Frontend Testing

- [ ] Dashboard loads and displays stats
- [ ] Comparison table displays data with sorting
- [ ] Filter functionality works
- [ ] Search finds symbols
- [ ] Alerts page shows open alerts
- [ ] Alert actions (acknowledge, resolve) work
- [ ] History page shows audit logs
- [ ] Responsive design on mobile/tablet
- [ ] Error states show proper messages
- [ ] Loading states appear during API calls

### Unit Tests

```bash
# Run tests (setup required)
npm test

# Test coverage
npm test -- --coverage
```

---

## 📦 Deployment Checklist

### Pre-Deployment

- [ ] Environment variables finalized for production
- [ ] MongoDB Atlas setup (or production instance)
- [ ] CORS origins updated to production domain
- [ ] SSL certificates configured
- [ ] API keys stored securely (not in code)
- [ ] All tests passing
- [ ] Performance optimizations applied
- [ ] Database backups configured
- [ ] Logging & monitoring configured
- [ ] Emergency contact information documented

### Deployment Steps

#### Option 1: Docker (Recommended)

```dockerfile
# Dockerfile.backend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY .env .env

EXPOSE 5000

CMD ["node", "server.js"]
```

```dockerfile
# Dockerfile.frontend
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY public ./public
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run with docker-compose
docker-compose up -d
```

#### Option 2: Traditional Deployment (AWS, VPS)

```bash
# On server
git clone <repo>
cd ikis-price-comparison/backend
npm install --production
npm start
```

### Post-Deployment

- [ ] Test health endpoint
- [ ] Monitor logs for errors
- [ ] Check database connectivity
- [ ] Test API endpoints
- [ ] Verify scheduled jobs execute
- [ ] Monitor system resources
- [ ] Test backup & restore procedure
- [ ] Create incident response plan
- [ ] Document runbooks

---

## 🔧 Troubleshooting Guide

### MongoDB Connection Issues

```javascript
// Check connection
const mongoose = require('mongoose');
console.log(mongoose.connection.readyState);
// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

// Test connection string
mongosh "mongodb+srv://user:password@cluster.mongodb.net/database"
```

### API Rate Limiting

```javascript
// VNDirect getting rate limited?
// Solution: Add delays between requests
await new Promise(r => setTimeout(r, 1000)); // 1 second delay

// Or use connection pooling
const http = require('http');
const agent = new http.Agent({ maxSockets: 5 });
```

### Scheduler Not Running

```javascript
// Check if cron expression is correct
const cron = require('cron');
const task = cron.schedule('30 15 * * *', () => {
  console.log('Running every day at 15:30');
});
```

### Frontend Not Connecting to Backend

```javascript
// Check CORS configuration in backend
app.use(cors({
  origin: 'http://localhost:3000'
}));

// Check API URL in frontend .env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📊 Performance Optimization

### Database Optimization

```javascript
// Add indexes
db.stock_prices.createIndex({ symbol: 1, date: 1, source: 1 })
db.comparisons.createIndex({ symbol: 1, date: 1 })
db.alerts.createIndex({ status: 1, severity: 1 })

// Monitor slow queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5).pretty()
```

### API Optimization

```javascript
// Implement caching
const cache = require('node-cache');
const myCache = new cache({ stdTTL: 600 });

// Use in endpoint
router.get('/comparisons', (req, res) => {
  const cached = myCache.get('comparisons');
  if (cached) return res.json(cached);
  
  // Fetch fresh data
  const data = Comparison.find(...);
  myCache.set('comparisons', data);
  res.json(data);
});

// Implement pagination
// Always limit results in queries
.limit(100)
.skip((page - 1) * pageSize)
```

### Frontend Optimization

```javascript
// Code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// Memoization
const ComparisonTable = React.memo(({ data }) => {
  // Component
});

// Image optimization
// Use WebP with fallbacks
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.png" alt="..." />
</picture>
```

---

## 📝 Documentation Checklist

- [ ] README.md with setup instructions
- [ ] API.md with endpoint documentation
- [ ] DATABASE.md with schema documentation
- [ ] DEPLOYMENT.md with deployment steps
- [ ] TROUBLESHOOTING.md with common issues
- [ ] CODE_STYLE.md with coding standards
- [ ] ARCHITECTURE.md with system design

---

## 🚨 Production Monitoring

### Key Metrics to Monitor

```javascript
// Sync Success Rate
const syncedToday = await AuditLog.countDocuments({
  action: 'price_synced',
  status: 'success',
  timestamp: { $gte: startOfDay }
});

// API Response Times
// Use middleware to track
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});

// Alert Generation Rate
const alertsToday = await Alert.countDocuments({
  createdAt: { $gte: startOfDay }
});

// Database Size
db.stats().dataSize
```

### Alerting Rules

Set up alerts for:
- Sync failed for more than 1 hour
- API response time > 5 seconds
- Database disk space > 80%
- Memory usage > 90%
- Error rate > 5%
- Unacknowledged critical alerts > 10

---

## 📞 Support & Escalation

**Issues During Development:**
1. Check documentation in /docs
2. Review logs: `logs/error.log`
3. Test with curl/Postman
4. Check environment variables
5. Consult MongoDB Atlas console
6. Review API provider status pages

**Production Issues:**
1. Check application logs
2. Check database health
3. Check API provider status
4. Review recent deployments
5. Check system resources
6. Review monitoring dashboards