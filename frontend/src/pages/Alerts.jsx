import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import api from '../services/api'
import AlertBadge from '../components/AlertBadge'

const PAGE_SIZE = 20

export default function Alerts() {
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(null) // alertId being actioned

  const [filters, setFilters] = useState({ status: 'open', severity: '', symbol: '' })

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, page: p }
      if (filters.status)   params.status   = filters.status
      if (filters.severity) params.severity = filters.severity
      if (filters.symbol)   params.symbol   = filters.symbol.toUpperCase()

      const res = await api.alerts.list(params)
      setData(res.data)
      setTotal(res.total)
      setPage(p)
    } catch (e) { console.error(e) }
    finally     { setLoading(false) }
  }, [filters])

  useEffect(() => { load(1) }, [load])

  const acknowledge = async (id) => {
    setActing(id)
    try {
      await api.alerts.acknowledge(id, { acknowledgedBy: 'user' })
      load(page)
    } catch (e) { alert(e.message) }
    finally { setActing(null) }
  }

  const resolve = async (id) => {
    const resolution = prompt('Lý do xử lý:')
    if (!resolution) return
    setActing(id)
    try {
      await api.alerts.resolve(id, { resolvedBy: 'user', resolution })
      load(page)
    } catch (e) { alert(e.message) }
    finally { setActing(null) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fieldLabel  = { ceilingPrice: 'Giá Trần', floorPrice: 'Giá Sàn', referencePrice: 'Giá TC' }
  const sourceLabel = { vps: 'VPS', vndirect: 'VNDirect', tcbs: 'TCBS' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Cảnh báo</h1>
        <span className="text-sm text-gray-400">{total} cảnh báo</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="open">Đang mở</option>
          <option value="acknowledged">Đã ghi nhận</option>
          <option value="resolved">Đã xử lý</option>
        </select>
        <select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Tất cả mức độ</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <input type="text" placeholder="Tìm mã..." value={filters.symbol}
          onChange={e => setFilters(f => ({ ...f, symbol: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32" />
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Đang tải...</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-20 text-gray-400">
          Không có cảnh báo nào
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(alert => (
            <div key={alert._id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-800">{alert.symbol}</span>
                  <AlertBadge type={alert.severity} />
                  <AlertBadge type={alert.status} />
                  {alert.exchange && <span className="text-xs text-gray-400">{alert.exchange}</span>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{dayjs(alert.createdAt).format('DD/MM HH:mm')}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Loại giá</p>
                  <p className="font-medium">{fieldLabel[alert.discrepancyType] ?? alert.discrepancyType}</p>
                </div>
                <div>
                  <p className="text-gray-500">Chênh lệch</p>
                  <p className="font-medium text-red-600">{alert.differencePercent?.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-500">KIS</p>
                  <p className="font-medium">{alert.sources?.kisValue?.toLocaleString('vi-VN') ?? '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">{sourceLabel[alert.sources?.source] ?? alert.sources?.source ?? '—'}</p>
                  <p className="font-medium text-red-600">{alert.sources?.sourceValue?.toLocaleString('vi-VN') ?? '—'}</p>
                </div>
              </div>

              {alert.resolution && (
                <p className="mt-2 text-xs text-gray-500 italic">Xử lý: {alert.resolution}</p>
              )}

              {alert.status !== 'resolved' && (
                <div className="mt-3 flex gap-2">
                  {alert.status === 'open' && (
                    <button onClick={() => acknowledge(alert._id)} disabled={acting === alert._id}
                      className="px-3 py-1 text-xs border border-yellow-400 text-yellow-600 rounded hover:bg-yellow-50 disabled:opacity-50">
                      Ghi nhận
                    </button>
                  )}
                  <button onClick={() => resolve(alert._id)} disabled={acting === alert._id}
                    className="px-3 py-1 text-xs border border-green-400 text-green-600 rounded hover:bg-green-50 disabled:opacity-50">
                    Đánh dấu xử lý
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => load(page - 1)} disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">← Trước</button>
          <span className="text-sm text-gray-500">Trang {page} / {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">Sau →</button>
        </div>
      )}
    </div>
  )
}
