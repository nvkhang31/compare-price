# 🔌 API INTEGRATION GUIDE - iKIS, VNDirect, TCBS

## Overview

This document specifies how to integrate with all three price data sources.

---

## 1. iKIS API (Internal/Primary Source)

### Status: ⚠️ PENDING
**Note:** iKIS API endpoint details need to be provided by the iKIS team.

### Required Information (TBD)
```
- API Base URL: ?
- Authentication Method: API Key? OAuth? JWT?
- Endpoint for getting all symbols: ?
- Endpoint for getting prices: ?
- Rate limit: ? requests per minute
- Real-time capable: WebSocket? Long polling? REST only?
- Fields returned: ceiling, floor, reference, OHLCV?
- Update frequency: Daily? Intraday?
- Error handling: Retry policy?
```

### Template Service Structure (Placeholder)
```javascript
// backend/src/services/ikisService.js

const axios = require('axios');

class IKISService {
  constructor() {
    this.baseURL = process.env.IKIS_API_URL;
    this.apiKey = process.env.IKIS_API_KEY;
    this.timeout = 30000;
  }

  // Get all symbols
  async getSymbols() {
    try {
      const response = await axios.get(`${this.baseURL}/symbols`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: this.timeout
      });
      return response.data.data;
    } catch (error) {
      throw new Error(`iKIS getSymbols failed: ${error.message}`);
    }
  }

  // Get prices for all symbols
  async getAllPrices() {
    try {
      const response = await axios.get(`${this.baseURL}/prices`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: this.timeout
      });
      return response.data.data;
    } catch (error) {
      throw new Error(`iKIS getAllPrices failed: ${error.message}`);
    }
  }

  // Get price for specific symbol
  async getPriceBySymbol(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/prices/${symbol}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: this.timeout
      });
      return response.data.data;
    } catch (error) {
      throw new Error(`iKIS getPriceBySymbol(${symbol}) failed: ${error.message}`);
    }
  }

  // Transform iKIS response to standard format
  transformPrice(ikisPrice) {
    return {
      symbol: ikisPrice.symbol,
      exchange: ikisPrice.exchange,
      ceilingPrice: ikisPrice.ceiling || ikisPrice.ceilingPrice,
      floorPrice: ikisPrice.floor || ikisPrice.floorPrice,
      referencePrice: ikisPrice.reference || ikisPrice.refPrice,
      openPrice: ikisPrice.open || null,
      highPrice: ikisPrice.high || null,
      lowPrice: ikisPrice.low || null,
      closePrice: ikisPrice.close || null,
      volume: ikisPrice.vol || null,
      value: ikisPrice.val || null,
      lastUpdated: new Date(ikisPrice.timestamp),
      source: 'ikis'
    };
  }
}

module.exports = new IKISService();
```

### Implementation Steps (Once API details provided)
1. Get API credentials from iKIS team
2. Update .env with IKIS_API_URL, IKIS_API_KEY
3. Implement authentication method
4. Test symbol retrieval
5. Test price retrieval
6. Implement error handling & retries
7. Integrate into daily sync scheduler

---

## 2. VNDirect API (Public - Ready)

### Base URL
```
https://finfo-api.vndirect.com.vn/v4/
```

### No Authentication Required ✅

### Endpoint 1: Get Stock Prices (Historical)

**URL:**
```
GET https://finfo-api.vndirect.com.vn/v4/stock_prices/
```

**Parameters:**
```javascript
{
  q: "code:ACB~date:gte:2024-06-01~date:lte:2024-06-23",
  sort: "date",
  size: 1000,    // Max per request
  page: 1
}
```

**Response Structure:**
```javascript
{
  "data": [
    {
      "code": "ACB",
      "date": "2024-06-23",
      "time": "14:44:58",
      "floor": "HOSE",        // Exchange: HOSE, HNX, UPCOM
      "type": "STOCK",
      "basicPrice": 31500,    // 🎯 Reference Price
      "ceilingPrice": 33700,  // 🎯 Ceiling Price
      "floorPrice": 29300,    // 🎯 Floor Price
      "open": 31300,
      "high": 31700,
      "low": 31000,
      "close": 31600,
      "average": 31400,
      "adOpen": 31300,
      "adHigh": 31700,
      "adLow": 31000,
      "adClose": 31600,
      "adAverage": 31400,
      "nmVolume": 1234567,    // Normal volume
      "nmValue": 38800000000, // Normal value
      "ptVolume": 0,
      "ptValue": 0,
      "change": 100,
      "adChange": 100,
      "pctChange": 0.32
    }
  ],
  "total": 15
}
```

### Endpoint 2: Get All Symbols

**URL:**
```
GET https://finfo-api.vndirect.com.vn/stocks
```

**Response:**
```javascript
{
  "data": [
    {
      "code": "ACB",
      "symbol": "ACB",
      "name": "Ngân hàng TMCP Á Châu",
      "nameEn": "Asia Commercial Bank",
      "exchange": "HOSE",
      "industry": 10,
      "type": "STOCK",
      "status": "active"
    }
  ]
}
```

### Service Implementation

```javascript
// backend/src/services/vndirectService.js

const axios = require('axios');

class VNDirectService {
  constructor() {
    this.baseURL = 'https://finfo-api.vndirect.com.vn';
    this.timeout = 30000;
  }

  // Get all symbols
  async getSymbols() {
    try {
      const response = await axios.get(`${this.baseURL}/stocks`, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      return response.data.data || [];
    } catch (error) {
      throw new Error(`VNDirect getSymbols failed: ${error.message}`);
    }
  }

  // Get prices for symbols in date range
  async getPricesByDateRange(symbols, startDate, endDate) {
    const allPrices = [];
    
    // Process in batches to avoid overwhelming API
    for (let i = 0; i < symbols.length; i += 10) {
      const batch = symbols.slice(i, i + 10);
      const promises = batch.map(symbol => 
        this.getPricesBySymbolAndDate(symbol, startDate, endDate)
      );
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allPrices.push(...result.value);
        } else {
          console.error(`Error fetching ${batch[index]}: ${result.reason}`);
        }
      });
      
      // Rate limiting: wait 1 second between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return allPrices;
  }

  // Get prices for single symbol
  async getPricesBySymbolAndDate(symbol, startDate, endDate) {
    try {
      const query = `code:${symbol}~date:gte:${startDate}~date:lte:${endDate}`;
      
      const response = await axios.get(
        `${this.baseURL}/v4/stock_prices/`,
        {
          params: {
            q: query,
            sort: 'date',
            size: 1000,
            page: 1
          },
          timeout: this.timeout,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }
      );
      
      return response.data.data || [];
    } catch (error) {
      throw new Error(`VNDirect getPricesBySymbolAndDate(${symbol}) failed: ${error.message}`);
    }
  }

  // Transform response to standard format
  transformPrice(vndPrice) {
    return {
      symbol: vndPrice.code,
      exchange: vndPrice.floor,
      ceilingPrice: parseFloat(vndPrice.ceilingPrice),
      floorPrice: parseFloat(vndPrice.floorPrice),
      referencePrice: parseFloat(vndPrice.basicPrice),
      openPrice: parseFloat(vndPrice.open),
      highPrice: parseFloat(vndPrice.high),
      lowPrice: parseFloat(vndPrice.low),
      closePrice: parseFloat(vndPrice.close),
      volume: parseInt(vndPrice.nmVolume),
      value: parseInt(vndPrice.nmValue),
      lastUpdated: new Date(`${vndPrice.date} ${vndPrice.time}`),
      source: 'vndirect'
    };
  }
}

module.exports = new VNDirectService();
```

### Rate Limiting
- No official limit published
- Recommended: 1 request per second per symbol
- Batch requests in groups of 10 with 1-second delays between batches

### Error Handling
```javascript
const handleVNDirectError = (error) => {
  if (error.response?.status === 429) {
    // Rate limited - implement exponential backoff
    return 'RATE_LIMITED';
  } else if (error.response?.status === 404) {
    // Symbol not found
    return 'NOT_FOUND';
  } else if (error.code === 'ECONNABORTED') {
    // Timeout
    return 'TIMEOUT';
  } else {
    return 'UNKNOWN_ERROR';
  }
};
```

---

## 3. TCBS API (Public - Ready)

### Base URL
```
https://apipubaws.tcbs.com.vn/
```

### No Authentication Required ✅

### Endpoint 1: Current Quote (Real-time)

**URL:**
```
GET https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/{SYMBOL}/overview
```

**Example:**
```
GET https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/ACB/overview
```

**Response Structure:**
```javascript
{
  "id": 1,
  "symbol": "ACB",
  "name": "Ngân hàng TMCP Á Châu",
  "nameEn": "Asia Commercial Bank",
  "price": 31600,              // Current/Last price
  "ceilingPrice": 33700,       // 🎯 Ceiling Price
  "floorPrice": 29300,         // 🎯 Floor Price
  "refPrice": 31500,           // 🎯 Reference Price
  "priceChange": 100,
  "pricePercent": 0.32,
  "exchange": "HOSE",
  "tradingStatus": "N",
  "volume": 1234567,
  "value": 38800000000,
  "bidPrice": 31550,
  "bidVolume": 10000,
  "offerPrice": 31650,
  "offerVolume": 12000,
  "lastPrice": 31600,
  "lastVol": 100,
  "totalVolume": 1234567,
  "totalValue": 38800000000,
  "marketCap": 8900000000000,
  "eps": 2500,
  "pe": 12.64
}
```

### Endpoint 2: Historical Daily Data

**URL:**
```
GET https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term
```

**Parameters:**
```javascript
{
  ticker: "ACB",
  type: "stock",
  resolution: "D",     // D=Daily, 1H=1Hour, 15=15min, 5=5min, 1=1min
  from: 1719100800,    // Unix timestamp in seconds
  to: 1719359999       // Unix timestamp in seconds
}
```

**Response Structure:**
```javascript
{
  "data": [
    {
      "tradingDate": 1719100800000,  // Timestamp in milliseconds
      "o": 31300,                    // Open
      "h": 31700,                    // High
      "l": 31000,                    // Low
      "c": 31600,                    // Close
      "v": 1234567,                  // Volume
      "ma": 31400                    // Moving average
    }
  ],
  "nextTime": null,
  "isOTC": false
}
```

### Service Implementation

```javascript
// backend/src/services/tcbsService.js

const axios = require('axios');

class TCBSService {
  constructor() {
    this.baseURL = 'https://apipubaws.tcbs.com.vn';
    this.timeout = 30000;
  }

  // Get current quote for symbol
  async getQuote(symbol) {
    try {
      const response = await axios.get(
        `${this.baseURL}/tcanalysis/v1/ticker/${symbol}/overview`,
        {
          timeout: this.timeout,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Symbol not found
      }
      throw new Error(`TCBS getQuote(${symbol}) failed: ${error.message}`);
    }
  }

  // Get current quotes for multiple symbols
  async getQuotes(symbols) {
    const quotes = [];
    
    for (let i = 0; i < symbols.length; i += 10) {
      const batch = symbols.slice(i, i + 10);
      const promises = batch.map(symbol => this.getQuote(symbol));
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          quotes.push(result.value);
        }
      });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return quotes;
  }

  // Get historical daily data
  async getHistoricalData(symbol, startDate, endDate) {
    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      
      const response = await axios.get(
        `${this.baseURL}/stock-insight/v1/stock/bars-long-term`,
        {
          params: {
            ticker: symbol,
            type: 'stock',
            resolution: 'D',
            from: startTimestamp,
            to: endTimestamp
          },
          timeout: this.timeout,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }
      );
      
      return response.data.data || [];
    } catch (error) {
      throw new Error(`TCBS getHistoricalData(${symbol}) failed: ${error.message}`);
    }
  }

  // Transform quote to standard format
  transformQuote(tcbsQuote) {
    return {
      symbol: tcbsQuote.symbol,
      exchange: tcbsQuote.exchange,
      ceilingPrice: parseFloat(tcbsQuote.ceilingPrice),
      floorPrice: parseFloat(tcbsQuote.floorPrice),
      referencePrice: parseFloat(tcbsQuote.refPrice),
      openPrice: null,  // Not in quote endpoint
      highPrice: null,
      lowPrice: null,
      closePrice: parseFloat(tcbsQuote.price),
      volume: parseInt(tcbsQuote.volume),
      value: parseInt(tcbsQuote.value),
      lastUpdated: new Date(),
      source: 'tcbs'
    };
  }

  // Transform historical bar to standard format
  transformBar(tcbsBar) {
    return {
      tradingDate: new Date(tcbsBar.tradingDate),
      openPrice: parseFloat(tcbsBar.o),
      highPrice: parseFloat(tcbsBar.h),
      lowPrice: parseFloat(tcbsBar.l),
      closePrice: parseFloat(tcbsBar.c),
      volume: parseInt(tcbsBar.v)
    };
  }
}

module.exports = new TCBSService();
```

### Rate Limiting
- No official limit published
- Recommended: 1-2 requests per second
- Batch requests with 500ms delays

### Error Handling
```javascript
const handleTCBSError = (error) => {
  if (error.response?.status === 404) {
    // Symbol not found
    return 'NOT_FOUND';
  } else if (error.response?.status === 429) {
    // Rate limited
    return 'RATE_LIMITED';
  } else if (error.code === 'ECONNABORTED') {
    // Timeout
    return 'TIMEOUT';
  } else {
    return 'UNKNOWN_ERROR';
  }
};
```

---

## 4. Comparison Service

### Purpose
Compare prices from all three sources and identify discrepancies.

### Implementation

```javascript
// backend/src/services/comparisonService.js

class ComparisonService {
  
  async compareSymbol(symbol, date) {
    const StockPrice = require('../models/StockPrice');
    
    // Get prices from all sources for this symbol
    const ikisPrice = await StockPrice.findOne({
      symbol, date, source: 'ikis'
    });
    
    const vndPrice = await StockPrice.findOne({
      symbol, date, source: 'vndirect'
    });
    
    const tcbsPrice = await StockPrice.findOne({
      symbol, date, source: 'tcbs'
    });
    
    // Build comparison object
    const comparison = {
      symbol,
      date,
      exchange: ikisPrice?.exchange,
      
      ikis: {
        ceilingPrice: ikisPrice?.ceilingPrice,
        floorPrice: ikisPrice?.floorPrice,
        referencePrice: ikisPrice?.referencePrice
      },
      
      vndirect: {
        ceilingPrice: vndPrice?.ceilingPrice,
        floorPrice: vndPrice?.floorPrice,
        referencePrice: vndPrice?.referencePrice
      },
      
      tcbs: {
        ceilingPrice: tcbsPrice?.ceilingPrice,
        floorPrice: tcbsPrice?.floorPrice,
        referencePrice: tcbsPrice?.referencePrice
      },
      
      discrepancies: [],
      hasDiscrepancy: false,
      comparedAt: new Date()
    };
    
    // Compare ceiling prices
    comparison.discrepancies.push(
      this.compareField(
        'ceilingPrice',
        {
          ikis: ikisPrice?.ceilingPrice,
          vndirect: vndPrice?.ceilingPrice,
          tcbs: tcbsPrice?.ceilingPrice
        }
      )
    );
    
    // Compare floor prices
    comparison.discrepancies.push(
      this.compareField(
        'floorPrice',
        {
          ikis: ikisPrice?.floorPrice,
          vndirect: vndPrice?.floorPrice,
          tcbs: tcbsPrice?.floorPrice
        }
      )
    );
    
    // Compare reference prices
    comparison.discrepancies.push(
      this.compareField(
        'referencePrice',
        {
          ikis: ikisPrice?.referencePrice,
          vndirect: vndPrice?.referencePrice,
          tcbs: tcbsPrice?.referencePrice
        }
      )
    );
    
    // Check if has any discrepancy
    comparison.hasDiscrepancy = comparison.discrepancies.some(d => d.hasDiscrepancy);
    comparison.discrepancyCount = comparison.discrepancies.filter(d => d.hasDiscrepancy).length;
    
    return comparison;
  }
  
  compareField(fieldName, values) {
    const prices = Object.values(values).filter(p => p !== null && p !== undefined);
    
    if (prices.length < 2) {
      return {
        field: fieldName,
        values,
        hasDiscrepancy: false,
        maxDifference: null,
        maxDifferencePercent: null
      };
    }
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const difference = maxPrice - minPrice;
    const differencePercent = (difference / minPrice) * 100;
    
    return {
      field: fieldName,
      values,
      hasDiscrepancy: difference > 0, // Any difference = discrepancy
      maxDifference: difference,
      maxDifferencePercent: parseFloat(differencePercent.toFixed(2)),
      minValue: minPrice,
      maxValue: maxPrice
    };
  }
}

module.exports = new ComparisonService();
```

---

## 5. Data Sync Flow

### Daily Batch Sync

```javascript
// backend/src/schedulers/dailySync.js

const cron = require('node-cron');
const IKISService = require('../services/ikisService');
const VNDirectService = require('../services/vndirectService');
const TCBSService = require('../services/tcbsService');
const ComparisonService = require('../services/comparisonService');
const StockPrice = require('../models/StockPrice');
const AuditLog = require('../models/AuditLog');

class DailySyncScheduler {
  
  startDailySync() {
    // Run at 3:30 PM daily (15:30)
    cron.schedule('30 15 * * *', () => {
      this.runDailySync();
    });
  }

  async runDailySync() {
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];
    
    try {
      console.log(`Starting daily sync for ${today}...`);
      
      // Step 1: Get all symbols
      const symbols = await VNDirectService.getSymbols();
      console.log(`Found ${symbols.length} symbols`);
      
      // Step 2: Fetch iKIS prices
      console.log('Fetching iKIS prices...');
      const ikisPrices = await IKISService.getAllPrices();
      await this.savePrices(ikisPrices, 'ikis');
      
      // Step 3: Fetch VNDirect prices
      console.log('Fetching VNDirect prices...');
      const vndPrices = await VNDirectService.getPricesByDateRange(
        symbols.map(s => s.code),
        today,
        today
      );
      await this.savePrices(vndPrices, 'vndirect');
      
      // Step 4: Fetch TCBS quotes
      console.log('Fetching TCBS quotes...');
      const tcbsQuotes = await TCBSService.getQuotes(
        symbols.map(s => s.code)
      );
      await this.savePrices(tcbsQuotes, 'tcbs');
      
      // Step 5: Run comparisons
      console.log('Running comparisons...');
      let comparisonCount = 0;
      for (const symbol of symbols) {
        const comparison = await ComparisonService.compareSymbol(symbol.code, today);
        await comparison.save();
        if (comparison.hasDiscrepancy) comparisonCount++;
      }
      
      const duration = Date.now() - startTime;
      
      // Step 6: Log audit trail
      await AuditLog.create({
        action: 'daily_sync_completed',
        status: 'success',
        details: {
          date: today,
          symbolsProcessed: symbols.length,
          comparisonsWithDiscrepancies: comparisonCount,
          duration: duration
        },
        timestamp: new Date()
      });
      
      console.log(`Daily sync completed in ${duration}ms. Found ${comparisonCount} discrepancies.`);
      
    } catch (error) {
      console.error('Daily sync failed:', error);
      
      await AuditLog.create({
        action: 'daily_sync_failed',
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

    // Bulk insert
    await StockPrice.insertMany(transformedPrices, { ordered: false });
  }
}

module.exports = new DailySyncScheduler();
```

---

## 6. Error Handling & Retries

### Retry Strategy

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
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = { retryWithBackoff };
```

### Usage

```javascript
const { retryWithBackoff } = require('../utils/retryUtil');

// Retry fetching prices
const prices = await retryWithBackoff(
  () => VNDirectService.getPricesBySymbolAndDate('ACB', '2024-06-23', '2024-06-23'),
  3,
  1000
);
```