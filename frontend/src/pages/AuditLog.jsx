import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import api from '../services/api'

const PAGE_SIZE = 50

const actionLabel = {
  daily_sync_started:    'Bắt đầu sync',
  daily_sync_completed:  'Sync hoàn thành',
  daily_sync_failed:     'Sync thất bại',
  manual_sync_triggered: 'Sync thủ công',
  comparison_completed:  'So sánh xong',
  alert_created:         'Tạo cảnh báo',
  alert_acknowledged:    'Ghi nhận cảnh báo',
  alert_resolved:        'Xử lý cảnh báo'
}

const statusStyle = {
  success: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  failed:  'bg-red-100 text-red-700'
}

export default function AuditLog() {
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ action: '', status: '' })

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, page: p }
      if (filters.action) params.action = filters.action
      if (filters.status) params.status = filters.status

      const res = await api.auditLogs.list(params)
      setData(res.data)
      setTotal(res.total)
      setPage(p)
    } catch (e) { console.error(e) }
    finally     { setLoading(false) }
  }, [filters])

  useEffect(() => { load(1) }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Audit Log</h1>
        <span className="text-sm text-gray-400">{total} bản ghi</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-3">
        <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Tất cả hành động</option>
          {Object.entries(actionLabel).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="success">Thành công</option>
          <option value="partial">Một phần</option>
          <option value="failed">Thất bại</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Không có dữ liệu</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Hành động</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Kích hoạt bởi</th>
                <th className="px-4 py-3 font-medium">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {data.map(log => (
                <tr key={log._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                    {dayjs(log.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">
                    {actionLabel[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyle[log.status] ?? 'bg-gray-100'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{log.triggeredBy}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs truncate">
                    {log.details?.date && `Ngày: ${log.details.date}`}
                    {log.details?.kis?.total != null && ` | KIS: ${log.details.kis.total}`}
                    {log.details?.comparison?.withDiscrepancy != null && ` | Sai lệch: ${log.details.comparison.withDiscrepancy}`}
                    {log.details?.alertsCreated != null && ` | Alerts: ${log.details.alertsCreated}`}
                    {log.details?.error && <span className="text-red-400"> Lỗi: {log.details.error}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
