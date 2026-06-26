import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectOption } from '@/components/ui/Select'
import { DateInput } from '@/components/ui/DateInput'
import api from '../services/api'

const PAGE_SIZE = 50

const SOURCE_LABELS = {
  vps:      'VPS',
  kbs:      'KBS',
  vndirect: 'VNDirect',
  tcbs:     'TCBS'
}

// Color accent per source
const SOURCE_COLORS = {
  vps:      { header: 'text-violet-600', bg: 'bg-violet-50/60', border: 'border-violet-100' },
  kbs:      { header: 'text-teal-600',   bg: 'bg-teal-50/60',   border: 'border-teal-100'   },
  vndirect: { header: 'text-orange-600', bg: 'bg-orange-50/60', border: 'border-orange-100' },
  tcbs:     { header: 'text-pink-600',   bg: 'bg-pink-50/60',   border: 'border-pink-100'   }
}

function KisPriceCell({ value }) {
  if (value == null) return <span className="text-gray-300 select-none">—</span>
  return <span className="font-medium text-gray-700 tabular-nums">{value.toLocaleString('vi-VN')}</span>
}

function CompareCell({ field }) {
  if (!field || field.kisValue == null)   return <span className="text-gray-300 select-none">—</span>
  if (field.sourceValue == null)          return <span className="text-gray-300 select-none">—</span>
  if (field.match === false) {
    return (
      <span className="text-red-600 font-semibold tabular-nums">
        {field.sourceValue.toLocaleString('vi-VN')}
        <span className="block text-[10px] text-red-400 font-normal leading-tight">
          {field.diff > 0 ? '+' : ''}{field.diff?.toLocaleString('vi-VN')} ({field.diffPct?.toFixed(2)}%)
        </span>
      </span>
    )
  }
  return <span className="text-gray-500 tabular-nums">{field.sourceValue.toLocaleString('vi-VN')}</span>
}

function StatusBadge({ row }) {
  if (!row.hasDiscrepancy) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium border border-green-100">
        <CheckCircle2 size={11} strokeWidth={2.5} />
        Khớp
      </span>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      {row.discrepantSources?.map(src => (
        <span key={src} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-100 whitespace-nowrap">
          <XCircle size={11} strokeWidth={2.5} />
          {SOURCE_LABELS[src] ?? src}
        </span>
      ))}
    </div>
  )
}

function ExchangeBadge({ exchange }) {
  const colors = {
    HOSE:  'bg-blue-50 text-blue-600',
    HNX:   'bg-purple-50 text-purple-600',
    UPCOM: 'bg-gray-100 text-gray-500'
  }
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide', colors[exchange] ?? 'bg-gray-100 text-gray-400')}>
      {exchange}
    </span>
  )
}

function PaginationButton({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors',
        active
          ? 'bg-blue-600 text-white font-medium shadow-sm'
          : 'border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
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
      r.symbol, r.exchange ?? '',
      r.kisPrice?.ceilingPrice ?? '', r.kisPrice?.floorPrice ?? '', r.kisPrice?.referencePrice ?? ''
    ]
    const sourceCols = sources.flatMap(src => {
      const comp = r.comparisons?.find(c => c.source === src)
      return [comp?.ceiling?.sourceValue ?? '', comp?.floor?.sourceValue ?? '', comp?.reference?.sourceValue ?? '']
    })
    const status = r.hasDiscrepancy ? `Sai lệch (${r.discrepantSources?.join(', ')})` : 'Khớp'
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
    exchange:       ''
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

  // Page numbers to show (max 5 around current)
  const pageNumbers = () => {
    const delta = 2
    const range = []
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i)
    }
    return range
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <BarChart3 size={16} className="text-blue-600" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">So sánh giá</h1>
            {sourcesAvailable.length > 0 && (
              <p className="text-xs text-gray-400">
                So sánh với: {sourcesAvailable.map(s => SOURCE_LABELS[s] ?? s).join(' · ')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => exportCSV(data, sourcesAvailable)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium transition-colors"
        >
          <Download size={14} strokeWidth={2} />
          Xuất CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium uppercase tracking-wide">
            <SlidersHorizontal size={12} strokeWidth={2} />
            Bộ lọc
          </div>

          <DateInput
            value={filters.date}
            onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
            className="w-36"
          />

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Tìm mã (ACB...)"
              value={filters.symbol}
              onChange={e => setFilters(f => ({ ...f, symbol: e.target.value }))}
              className="border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-sm w-36 bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <Select
            value={filters.hasDiscrepancy}
            onChange={v => setFilters(f => ({ ...f, hasDiscrepancy: v }))}
            placeholder="Tất cả"
            className="w-32"
          >
            <SelectOption value="">Tất cả</SelectOption>
            <SelectOption value="true">Sai lệch</SelectOption>
            <SelectOption value="false">Khớp</SelectOption>
          </Select>

          <Select
            value={filters.exchange}
            onChange={v => setFilters(f => ({ ...f, exchange: v }))}
            placeholder="Tất cả sàn"
            className="w-36"
          >
            <SelectOption value="">Tất cả sàn</SelectOption>
            <SelectOption value="HOSE">HOSE</SelectOption>
            <SelectOption value="HNX">HNX</SelectOption>
            <SelectOption value="UPCOM">UPCOM</SelectOption>
            <SelectOption value="VN30">VN30</SelectOption>
          </Select>

          <span className="ml-auto text-sm text-gray-400">
            {loading ? '...' : <><strong className="text-gray-700">{total.toLocaleString()}</strong> kết quả</>}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm">Đang tải dữ liệu...</span>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center">
                <BarChart3 size={26} className="text-gray-300" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">Không có dữ liệu</p>
                <p className="text-xs mt-0.5">Thử nhấn <strong>Sync ngay</strong> để tải dữ liệu</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[900px]">
              <thead className="sticky top-0 z-10">
                {/* Group header row */}
                <tr className="text-center text-xs border-b border-gray-100 bg-gray-50">
                  <th colSpan={2} className="bg-gray-50" />
                  <th colSpan={3} className="px-2 py-2 font-semibold text-blue-600 bg-blue-50 border-x border-blue-100">
                    KIS (Tham chiếu)
                  </th>
                  {sourcesAvailable.map(src => {
                    const c = SOURCE_COLORS[src] ?? { header: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
                    return (
                      <th key={src} colSpan={3} className={cn('px-2 py-2 font-semibold border-x', c.header, c.bg, c.border)}>
                        {SOURCE_LABELS[src] ?? src}
                      </th>
                    )
                  })}
                  <th className="bg-gray-50" />
                </tr>
                {/* Column header row */}
                <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide sticky left-0 bg-gray-50 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Mã</th>
                  <th className="px-3 py-2.5 font-medium text-xs uppercase tracking-wide">Sàn</th>
                  <th className="px-3 py-2.5 font-medium text-right text-blue-500 text-xs uppercase tracking-wide">Trần</th>
                  <th className="px-3 py-2.5 font-medium text-right text-blue-500 text-xs uppercase tracking-wide">Sàn</th>
                  <th className="px-3 py-2.5 font-medium text-right text-blue-500 text-xs uppercase tracking-wide border-r border-gray-200">TC</th>
                  {sourcesAvailable.map(src => (
                    <>
                      <th key={`${src}-c`} className="px-3 py-2.5 font-medium text-right text-xs uppercase tracking-wide">Trần</th>
                      <th key={`${src}-f`} className="px-3 py-2.5 font-medium text-right text-xs uppercase tracking-wide">Sàn</th>
                      <th key={`${src}-r`} className="px-3 py-2.5 font-medium text-right text-xs uppercase tracking-wide border-r border-gray-200">TC</th>
                    </>
                  ))}
                  <th className="px-4 py-2.5 font-medium text-center text-xs uppercase tracking-wide">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map(row => {
                  const isDiscrepant = row.hasDiscrepancy
                  return (
                    <tr
                      key={row._id}
                      className={cn(
                        'hover:bg-blue-50/30 transition-colors duration-100',
                        isDiscrepant && 'bg-red-50/40'
                      )}
                    >
                      <td className={cn(
                        'px-4 py-2.5 font-semibold text-gray-800 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]',
                        isDiscrepant ? 'bg-red-50/70' : 'bg-white'
                      )}>
                        {row.symbol}
                      </td>
                      <td className="px-3 py-2.5">
                        <ExchangeBadge exchange={row.exchange} />
                      </td>
                      <td className="px-3 py-2.5 text-right"><KisPriceCell value={row.kisPrice?.ceilingPrice} /></td>
                      <td className="px-3 py-2.5 text-right"><KisPriceCell value={row.kisPrice?.floorPrice} /></td>
                      <td className="px-3 py-2.5 text-right border-r border-gray-100"><KisPriceCell value={row.kisPrice?.referencePrice} /></td>
                      {sourcesAvailable.map(src => {
                        const comp    = row.comparisons?.find(c => c.source === src)
                        const hasDiff = comp?.hasDiscrepancy
                        const c       = SOURCE_COLORS[src]
                        return (
                          <>
                            <td key={`${row._id}-${src}-c`} className={cn('px-3 py-2.5 text-right', hasDiff && c?.bg)}>
                              <CompareCell field={comp?.ceiling} />
                            </td>
                            <td key={`${row._id}-${src}-f`} className={cn('px-3 py-2.5 text-right', hasDiff && c?.bg)}>
                              <CompareCell field={comp?.floor} />
                            </td>
                            <td key={`${row._id}-${src}-r`} className={cn('px-3 py-2.5 text-right border-r border-gray-100', hasDiff && c?.bg)}>
                              <CompareCell field={comp?.reference} />
                            </td>
                          </>
                        )
                      })}
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge row={row} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Trang <strong className="text-gray-600">{page}</strong> / {totalPages}
            {' '}· <strong className="text-gray-600">{total.toLocaleString()}</strong> kết quả
          </p>
          <div className="flex items-center gap-1">
            <PaginationButton onClick={() => load(page - 1)} disabled={page === 1}>
              <ChevronLeft size={14} />
            </PaginationButton>
            {pageNumbers().map(n => (
              <PaginationButton key={n} onClick={() => load(n)} active={n === page}>
                {n}
              </PaginationButton>
            ))}
            <PaginationButton onClick={() => load(page + 1)} disabled={page === totalPages}>
              <ChevronRight size={14} />
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  )
}
