import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

instance.interceptors.response.use(
  res  => res.data,
  err  => Promise.reject(new Error(err.response?.data?.error || err.message))
)

const api = {
  health: () => instance.get('/health'),

  prices: {
    sync: () => instance.post('/prices/sync'),
    list: (params) => instance.get('/prices', { params })
  },

  comparisons: {
    list:     (params) => instance.get('/comparisons', { params }),
    summary:  (params) => instance.get('/comparisons/summary', { params }),
    bySymbol: (symbol) => instance.get(`/comparisons/${symbol}`)
  },

  alerts: {
    list:        (params) => instance.get('/alerts', { params }),
    acknowledge: (id, data) => instance.put(`/alerts/${id}/acknowledge`, data),
    resolve:     (id, data) => instance.put(`/alerts/${id}/resolve`, data)
  },

  auditLogs: {
    list: (params) => instance.get('/audit-logs', { params })
  },

  stats: () => instance.get('/stats')
}

export default api
