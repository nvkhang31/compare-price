import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import api from '../services/api'

const PAGE_SIZE = 50

const SOURCE_LABELS = {
  vps:      'VPS',
  kbs:      'KBS',
  vndirect: 'VNDirect',
  tcbs:     'TCBS'
}

function KisPriceCell({ value }) {
  if (value == null) return <span className="text-gray-300">—</span>
  return <span className="font-medium text-gray-800">{value.toLocaleString('vi-VN')}</span>
}

function CompareCell({ field }) {
  if (!field || field.kisValue == null) return <span className="text-gray-300">—</span>
  if (field.sourceValue == null)        return <span className="text-gray-300">—</span>
  if (field.match === false) {
    return (
      <span className="text-red-600 font-medium">
        {field.sourceValue.toLocaleString('vi-VN')}
        <span className="block text-xs text-red-400 font-normal">
          {field.diff > 0 ? '+' : ''}{field.diff?.toLocaleString('vi-VN')}
          {' '}({field.diffPct?.toFixed(2)}%)
        </span>
      </span>
    )
  }
  return <span className="text-gray-600">{field.sourceValue.toLocaleString('vi-VN')}</span>
}

function StatusBadge({ row }) {
  if (!row.hasDiscrepancy) {
    return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600 font-medium">Khớp</span>
  }
  return (
    <div className="flex flex-col gap-0.5">
      {row.discrepantSources?.map(src => (
        <span key={src} className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 font-medium">
          {SOURCE_LABELS[src] ?? src} sai lệch
        </span>
      ))}
    </div>
  )
}

function exportCSV(data, sources) {
  const sourceHeaders = sources.flatMap(s => {
    const label = SOURCE_LABELS[s] ?? s
    return [`${label} Trần`, `${label} Sàn`, `${label} TC`]
  })
  const headers = ['Mã', 'Sàn', 'KIS Trần', 'KIS Sàn', 'KIS TC', ...sourceHeaders, 'Trạng thái']

  const rows = data.map(r => {
    const base = [
      r.symbol,
      r.exchange ?? '',
      r.kisPrice?.ceilingPrice   ?? '',
      r.kisPrice?.floorPrice     ?? '',
      r.kisPrice?.referencePrice ?? ''
    ]
    const sourceCols = sources.flatMap(src => {
      const comp = r.comparisons?.find(c => c.source === src)
      return [
        comp?.ceiling?.sourceValue   ?? '',
        comp?.floor?.sourceValue     ?? '',
        comp?.reference?.sourceValue ?? ''
      ]
    })
    const status = r.hasDiscrepancy
      ? `Sai lệch (${r.discrepantSources?.join(', ')})`
      : 'Khớp'
    return [...base, ...sourceCols, status]
  })

  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url
  a.download = `comparisons_${dayjs().format('YYYYMMDD')}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function Comparisons() {
  const [data,             setData]             = useState([])
  const [total,            setTotal]            = useState(0)
  const [page,             setPage]             = useState(1)
  const [loading,          setLoading]          = useState(true)
  const [sourcesAvailable, setSourcesAvailable] = useState([])

  const [filters, setFilters] = useState({
    date:           dayjs().format('YYYY-MM-DD'),
    symbol:         '',
    hasDiscrepancy: '',
    exchange:       '' // 'HOSE' | 'HNX' | 'UPCOM' | 'VN30'
  })

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, page: p }
      if (filters.date)           params.date           = filters.date
      if (filters.symbol)         params.symbol         = filters.symbol.toUpperCase()
      if (filters.hasDiscrepancy) params.hasDiscrepancy = filters.hasDiscrepancy
      if (filters.exchange === 'VN30') {
        params.vn30 = 'true'
      } else if (filters.exchange) {
        params.exchange = filters.exchange
      }

      const res = await api.comparisons.list(params)
      setData(res.data)
      setTotal(res.total)
      setPage(p)
      if (res.sourcesAvailable?.length) setSourcesAvailable(res.sourcesAvailable)
    } catch (e) { console.error(e) }
    finally     { setLoading(false) }
  }, [filters])

  useEffect(() => { load(1) }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">So sánh giá</h1>
        <button
          onClick={() => exportCSV(data, sourcesAvailable)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
        >
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
          <option value="VN30">VN30</option>
        </select>
        <span className="text-sm text-gray-400 self-center">{total} kết quả</span>
        {sourcesAvailable.length > 0 && (
          <span className="text-sm text-blue-500 self-center">
            So sánh với: {sourcesAvailable.map(s => SOURCE_LABELS[s] ?? s).join(', ')}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Không có dữ liệu — thử nhấn <strong>Sync ngay</strong> để tải dữ liệu
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              {/* Group header row */}
              <tr className="text-center text-xs text-gray-400 border-b border-gray-100">
                <th colSpan={2} />
                <th colSpan={3} className="px-2 py-1.5 font-semibold text-blue-600 border-x border-gray-200">
                  KIS (tham chiếu)
                </th>
                {sourcesAvailable.map(src => (
                  <th key={src} colSpan={3} className="px-2 py-1.5 font-semibold text-gray-600 border-x border-gray-200">
                    {SOURCE_LABELS[src] ?? src}
                  </th>
                ))}
                <th />
              </tr>
              {/* Column header row */}
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2.5 font-medium">Mã</th>
                <th className="px-3 py-2.5 font-medium">Sàn</th>
                <th className="px-3 py-2.5 font-medium text-right text-blue-600">Trần</th>
                <th className="px-3 py-2.5 font-medium text-right text-blue-600">Sàn</th>
                <th className="px-3 py-2.5 font-medium text-right text-blue-600 border-r border-gray-200">TC</th>
                {sourcesAvailable.map(src => (
                  <>
                    <th key={`${src}-c`} className="px-3 py-2.5 font-medium text-right">Trần</th>
                    <th key={`${src}-f`} className="px-3 py-2.5 font-medium text-right">Sàn</th>
                    <th key={`${src}-r`} className="px-3 py-2.5 font-medium text-right border-r border-gray-200">TC</th>
                  </>
                ))}
                <th className="px-3 py-2.5 font-medium text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => {
                const rowHasDiscrepancy = row.hasDiscrepancy
                return (
                  <tr key={row._id}
                    className={`border-b last:border-0 hover:bg-gray-50 ${rowHasDiscrepancy ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.symbol}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{row.exchange}</td>
                    <td className="px-3 py-2.5 text-right"><KisPriceCell value={row.kisPrice?.ceilingPrice} /></td>
                    <td className="px-3 py-2.5 text-right"><KisPriceCell value={row.kisPrice?.floorPrice} /></td>
                    <td className="px-3 py-2.5 text-right border-r border-gray-100"><KisPriceCell value={row.kisPrice?.referencePrice} /></td>
                    {sourcesAvailable.map(src => {
                      const comp = row.comparisons?.find(c => c.source === src)
                      const cellBg = comp?.hasDiscrepancy ? 'bg-red-50' : ''
                      return (
                        <>
                          <td key={`${row._id}-${src}-c`} className={`px-3 py-2.5 text-right ${cellBg}`}>
                            <CompareCell field={comp?.ceiling} />
                          </td>
                          <td key={`${row._id}-${src}-f`} className={`px-3 py-2.5 text-right ${cellBg}`}>
                            <CompareCell field={comp?.floor} />
                          </td>
                          <td key={`${row._id}-${src}-r`} className={`px-3 py-2.5 text-right border-r border-gray-100 ${cellBg}`}>
                            <CompareCell field={comp?.reference} />
                          </td>
                        </>
                      )
                    })}
                    <td className="px-3 py-2.5 text-center"><StatusBadge row={row} /></td>
                  </tr>
                )
              })}
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
