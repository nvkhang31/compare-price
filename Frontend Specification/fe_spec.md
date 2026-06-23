# 🎨 FRONTEND ARCHITECTURE - React.js Specifications

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   └── Modal.jsx
│   │   │
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   ├── DiscrepancyChart.jsx
│   │   │   ├── AlertsSummary.jsx
│   │   │   └── LastSyncStatus.jsx
│   │   │
│   │   ├── ComparisonTable/
│   │   │   ├── ComparisonTable.jsx
│   │   │   ├── SymbolCell.jsx
│   │   │   ├── PriceComparison.jsx
│   │   │   ├── DiscrepancyIndicator.jsx
│   │   │   └── TableFilters.jsx
│   │   │
│   │   ├── Alerts/
│   │   │   ├── AlertsList.jsx
│   │   │   ├── AlertCard.jsx
│   │   │   ├── SeverityBadge.jsx
│   │   │   └── AlertActions.jsx
│   │   │
│   │   └── History/
│   │       ├── HistoryLog.jsx
│   │       ├── LogEntry.jsx
│   │       └── LogFilters.jsx
│   │
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── ComparePage.jsx
│   │   ├── AlertsPage.jsx
│   │   ├── HistoryPage.jsx
│   │   └── NotFoundPage.jsx
│   │
│   ├── hooks/
│   │   ├── useApi.js
│   │   ├── useData.js
│   │   ├── useFilters.js
│   │   ├── usePagination.js
│   │   └── useLocalStorage.js
│   │
│   ├── services/
│   │   ├── api.js (axios instance)
│   │   ├── priceService.js
│   │   ├── comparisonService.js
│   │   ├── alertService.js
│   │   └── auditService.js
│   │
│   ├── utils/
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   ├── helpers.js
│   │   ├── constants.js
│   │   └── colors.js
│   │
│   ├── styles/
│   │   ├── App.css
│   │   ├── tailwind.config.js
│   │   └── index.css
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── DataContext.jsx
│   │   └── NotificationContext.jsx
│   │
│   ├── App.jsx
│   ├── App.css
│   └── index.js
│
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── package.json
├── .env
├── .env.example
└── README.md
```

---

## Core Technologies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.0",
    "axios": "^1.4.0",
    "date-fns": "^2.30.0",
    "recharts": "^2.7.1",
    "react-table": "^8.9.1",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "vite": "^4.4.0",
    "@vitejs/plugin-react": "^4.0.0",
    "eslint": "^8.45.0"
  }
}
```

---

## 1. Dashboard Page

### Purpose
Provide executive summary and system health overview

### Components

#### App.jsx (Main Entry)
```javascript
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import HomePage from './pages/HomePage';
import ComparePage from './pages/ComparePage';
import AlertsPage from './pages/AlertsPage';
import HistoryPage from './pages/HistoryPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/comparisons" element={<ComparePage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
```

#### Dashboard.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import StatsCard from '../components/Dashboard/StatsCard';
import DiscrepancyChart from '../components/Dashboard/DiscrepancyChart';
import AlertsSummary from '../components/Dashboard/AlertsSummary';
import LastSyncStatus from '../components/Dashboard/LastSyncStatus';
import LoadingSpinner from '../components/common/LoadingSpinner';

function Dashboard() {
  const { data: stats, loading } = useApi('/api/stats');
  const { data: comparisons } = useApi('/api/comparisons/report?days=7');
  const { data: alerts } = useApi('/api/alerts?status=open');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Real-time price comparison monitoring</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Symbols"
          value={stats?.symbolsTracked || 0}
          icon="📊"
          color="blue"
        />
        <StatsCard
          title="Discrepancies Today"
          value={stats?.discrepanciesToday || 0}
          icon="⚠️"
          color="yellow"
          trend={stats?.discrepancyTrend}
        />
        <StatsCard
          title="Open Alerts"
          value={alerts?.length || 0}
          icon="🔔"
          color="red"
          onClick={() => window.location.href = '/alerts'}
        />
        <StatsCard
          title="Last Sync"
          value={stats?.lastSyncTime ? `${stats.lastSyncTime}ms` : 'N/A'}
          icon="⏱️"
          color="green"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Discrepancies Trend (7 Days)
          </h2>
          <DiscrepancyChart data={comparisons?.trend} />
        </div>

        {/* Severity Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Alerts by Severity
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-red-600">🔴 Critical</span>
              <span className="font-bold">{comparisons?.critical || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600">🟡 Warning</span>
              <span className="font-bold">{comparisons?.warning || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">🔵 Info</span>
              <span className="font-bold">{comparisons?.info || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Summary & Last Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AlertsSummary alerts={alerts?.slice(0, 5)} />
        <LastSyncStatus stats={stats} />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Manual Sync
        </button>
        <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Export Report
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
```

#### StatsCard.jsx
```javascript
import React from 'react';

function StatsCard({ title, value, icon, color, trend, onClick }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200'
  };

  return (
    <div 
      className={`${colors[color]} p-6 rounded-lg border-2 cursor-pointer hover:shadow-lg`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from yesterday
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

export default StatsCard;
```

---

## 2. Comparison Table Page

### Components

#### ComparisonTable.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { usePagination } from '../hooks/usePagination';
import { useFilters } from '../hooks/useFilters';
import TableFilters from './TableFilters';
import DiscrepancyIndicator from './DiscrepancyIndicator';
import LoadingSpinner from '../common/LoadingSpinner';

function ComparisonTable() {
  const [sortBy, setSortBy] = useState('symbol');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const { filters, setFilter } = useFilters({
    hasDiscrepancy: null,
    exchange: null,
    dateFrom: null,
    dateTo: null
  });

  const queryParams = new URLSearchParams({
    sort: sortBy,
    order: sortOrder,
    ...(filters.hasDiscrepancy !== null && { hasDiscrepancy: filters.hasDiscrepancy }),
    ...(filters.exchange && { exchange: filters.exchange })
  });

  const { data: comparisons, loading } = useApi(`/api/comparisons?${queryParams}`);
  const { page, pageSize, pageCount, goToPage } = usePagination(comparisons?.total);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Price Comparisons</h1>
        <p className="text-gray-600">Compare iKIS prices with VNDirect & TCBS</p>
      </div>

      {/* Filters */}
      <TableFilters filters={filters} onFilterChange={setFilter} />

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                  onClick={() => setSortBy('symbol')}>
                Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Exchange</th>
              
              {/* Ceiling Prices */}
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">iKIS Ceiling</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">VND Ceiling</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">TCBS Ceiling</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
              
              {/* Floor Prices */}
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">iKIS Floor</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">VND Floor</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">TCBS Floor</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
              
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Updated</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comparisons?.data?.map((comp) => (
              <tr key={comp._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{comp.symbol}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{comp.exchange}</td>
                
                {/* Ceiling Prices */}
                <td className="px-6 py-4 text-center text-sm text-gray-900">{comp.ikis.ceilingPrice}</td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">{comp.vndirect.ceilingPrice}</td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">{comp.tcbs.ceilingPrice}</td>
                <td className="px-6 py-4 text-center">
                  <DiscrepancyIndicator 
                    hasDiscrepancy={comp.discrepancies[0]?.hasDiscrepancy}
                    difference={comp.discrepancies[0]?.maxDifferencePercent}
                  />
                </td>
                
                {/* Floor Prices */}
                <td className="px-6 py-4 text-center text-sm text-gray-900">{comp.ikis.floorPrice}</td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">{comp.vndirect.floorPrice}</td>
                <td className="px-6 py-4 text-center text-sm text-gray-900">{comp.tcbs.floorPrice}</td>
                <td className="px-6 py-4 text-center">
                  <DiscrepancyIndicator 
                    hasDiscrepancy={comp.discrepancies[1]?.hasDiscrepancy}
                    difference={comp.discrepancies[1]?.maxDifferencePercent}
                  />
                </td>
                
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(comp.comparedAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button className="text-blue-600 hover:text-blue-900">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {(page - 1) * pageSize + 1} to {page * pageSize} of {comparisons?.total}
        </p>
        <div className="space-x-2">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => goToPage(i + 1)}
              className={`px-3 py-1 rounded ${
                page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ComparisonTable;
```

#### DiscrepancyIndicator.jsx
```javascript
import React from 'react';

function DiscrepancyIndicator({ hasDiscrepancy, difference }) {
  if (!hasDiscrepancy) {
    return <span className="text-green-600 font-semibold">✓ Match</span>;
  }

  const isSmall = difference < 1;
  const isMedium = difference >= 1 && difference < 5;
  const isLarge = difference >= 5;

  return (
    <span className={`font-semibold ${
      isLarge ? 'text-red-600' :
      isMedium ? 'text-yellow-600' :
      'text-blue-600'
    }`}>
      ✗ {difference?.toFixed(2)}%
    </span>
  );
}

export default DiscrepancyIndicator;
```

---

## 3. Alerts Page

#### AlertsPage.jsx
```javascript
import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import AlertsList from '../components/Alerts/AlertsList';
import LoadingSpinner from '../components/common/LoadingSpinner';

function AlertsPage() {
  const [status, setStatus] = useState('open');
  const [severity, setSeverity] = useState(null);

  const queryParams = new URLSearchParams({
    status: status,
    ...(severity && { severity: severity })
  });

  const { data: alerts, loading } = useApi(`/api/alerts?${queryParams}`);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
        <p className="text-gray-600">Price discrepancies and system notifications</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-lg">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={severity || ''}
          onChange={(e) => setSeverity(e.target.value || null)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Alerts List */}
      <AlertsList alerts={alerts?.data} />
    </div>
  );
}

export default AlertsPage;
```

#### AlertCard.jsx
```javascript
import React from 'react';
import SeverityBadge from './SeverityBadge';
import AlertActions from './AlertActions';

function AlertCard({ alert }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{alert.symbol}</h3>
            <SeverityBadge severity={alert.severity} />
            <span className="text-sm text-gray-600">
              {new Date(alert.createdAt).toLocaleString()}
            </span>
          </div>

          <p className="text-gray-600 mb-3">
            {alert.discrepancyType}: {alert.differencePercent?.toFixed(2)}% difference
          </p>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">iKIS</p>
              <p className="font-semibold text-gray-900">{alert.sources.ikis}</p>
            </div>
            <div>
              <p className="text-gray-600">VNDirect</p>
              <p className="font-semibold text-gray-900">{alert.sources.vndirect}</p>
            </div>
            <div>
              <p className="text-gray-600">TCBS</p>
              <p className="font-semibold text-gray-900">{alert.sources.tcbs}</p>
            </div>
          </div>
        </div>

        <AlertActions alert={alert} />
      </div>
    </div>
  );
}

export default AlertCard;
```

---

## 4. Custom Hooks

### useApi.js
```javascript
import { useState, useEffect } from 'react';
import * as api from '../services/api';

export function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get(url, options);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, options]);

  return { data, loading, error };
}
```

### useFilters.js
```javascript
import { useState, useCallback } from 'react';

export function useFilters(initialFilters) {
  const [filters, setFilters] = useState(initialFilters);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return { filters, setFilter, resetFilters };
}
```

### usePagination.js
```javascript
import { useState } from 'react';

export function usePagination(total, pageSize = 20) {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    pageCount,
    goToPage: (p) => setPage(Math.min(Math.max(1, p), pageCount))
  };
}
```

---

## 5. API Service Layer

### services/api.js
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

// Add auth token if available
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
instance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const get = (url, config) => instance.get(url, config);
export const post = (url, data, config) => instance.post(url, data, config);
export const put = (url, data, config) => instance.put(url, data, config);
export const delete_ = (url, config) => instance.delete(url, config);

export default instance;
```

---

## 6. Styling with Tailwind CSS

### tailwind.config.js
```javascript
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        success: '#16a34a',
        warning: '#ea8c55',
        danger: '#dc2626'
      }
    }
  },
  plugins: []
};
```