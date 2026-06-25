import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import api from '../services/api'

const PAGE_SIZE = 50

function PriceCell({ value }) {
  if (value == null) return <span className="text-gray-300">—</span>
  return <span>{value.toLocaleString('vi-VN')}</span>
}

function StatusBadge({ hasDiscrepancy }) {
  return hasDiscrepancy
    ? <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 font-medium">Sai lệch</span>
    : <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600 font-medium">Khớp</span>
}

function exportCSV(data) {
  const headers = ['Symbol','Exchange','KIS Trần','KIS Sàn','KIS TC','VND Trần','VND Sàn','VND TC','TCBS Trần','TCBS Sàn','TCBS TC','Status']
  const rows = data.map(r => [
    r.symbol, r.exchange ?? '',
    r.kis?.ceilingPrice ?? '', r.kis?.floorPrice ?? '', r.kis?.referencePrice ?? '',
    r.vndirect?.ceilingPrice ?? '', r.vndirect?.floorPrice ?? '', r.vndirect?.referencePrice ?? '',
    r.tcbs?.ceilingPrice ?? '', r.tcbs?.floorPrice ?? '', r.tcbs?.referencePrice ?? '',
    r.hasDiscrepancy ? 'Sai lệch' : 'Khớp'
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url
  a.download = `comparisons_${dayjs().format('YYYYMMDD')}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function Comparisons() {
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    date:            dayjs().format('YYYY-MM-DD'),
    symbol:          '',
    hasDiscrepancy:  '',
    exchange:        ''
  })

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, page: p }
      if (filters.date)           params.date           = filters.date
      if (filters.symbol)         params.symbol         = filters.symbol.toUpperCase()
      if (filters.hasDiscrepancy) params.hasDiscrepancy = filters.hasDiscrepancy
      if (filters.exchange)       params.exchange       = filters.exchange

      const res = await api.comparisons.list(params)
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
        <h1 className="text-xl font-semibold text-gray-800">So sánh giá</h1>
        <button onClick={() => exportCSV(data)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
          Xuất CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3">
        <input type="date" value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
        <input type="text" placeholder="Tìm mã (ACB...)" value={filters.symbol}
          onChange={e => setFilters(f => ({ ...f, symbol: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36" />
        <select value={filters.hasDiscrepancy}
          onChange={e => setFilters(f => ({ ...f, hasDiscrepancy: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Tất cả</option>
          <option value="true">Sai lệch</option>
          <option value="false">Khớp</option>
        </select>
        <select value={filters.exchange}
          onChange={e => setFilters(f => ({ ...f, exchange: e.target.value }))}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">Tất cả sàn</option>
          <option value="HOSE">HOSE</option>
          <option value="HNX">HNX</option>
          <option value="UPCOM">UPCOM</option>
        </select>
        <span className="text-sm text-gray-400 self-center">
          {total} kết quả
        </span>
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
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-3 py-3 font-medium">Sàn</th>
                <th className="px-3 py-3 font-medium text-right">KIS Trần</th>
                <th className="px-3 py-3 font-medium text-right">KIS Sàn</th>
                <th className="px-3 py-3 font-medium text-right">KIS TC</th>
                <th className="px-3 py-3 font-medium text-right">VND Trần</th>
                <th className="px-3 py-3 font-medium text-right">VND Sàn</th>
                <th className="px-3 py-3 font-medium text-right">VND TC</th>
                <th className="px-3 py-3 font-medium text-right">TCBS Trần</th>
                <th className="px-3 py-3 font-medium text-right">TCBS Sàn</th>
                <th className="px-3 py-3 font-medium text-right">TCBS TC</th>
                <th className="px-3 py-3 font-medium text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row._id} className={`border-b last:border-0 hover:bg-gray-50 ${row.hasDiscrepancy ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{row.symbol}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{row.exchange}</td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.kis?.ceilingPrice} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.kis?.floorPrice} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.kis?.referencePrice} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.vndirect?.ceilingPrice} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.vndirect?.floorPrice} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.vndirect?.referencePrice} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.tcbs?.ceilingPrice} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.tcbs?.floorPrice} /></td>
                  <td className="px-3 py-2.5 text-right"><PriceCell value={row.tcbs?.referencePrice} /></td>
                  <td className="px-3 py-2.5 text-center"><StatusBadge hasDiscrepancy={row.hasDiscrepancy} /></td>
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
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">
            ← Trước
          </button>
          <span className="text-sm text-gray-500">Trang {page} / {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">
            Sau →
          </button>
        </div>
      )}
    </div>
  )
}
