import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  Bell,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectOption } from '@/components/ui/Select'
import api from '../services/api'
import AlertBadge from '../components/AlertBadge'

const PAGE_SIZE = 20

const SEVERITY_BORDER = {
  critical: 'border-l-red-500',
  warning:  'border-l-amber-400',
  info:     'border-l-blue-400'
}

const SEVERITY_BG = {
  critical: 'bg-red-50/40',
  warning:  'bg-amber-50/30',
  info:     'bg-blue-50/20'
}

const FIELD_LABELS  = { ceilingPrice: 'Giá Trần', floorPrice: 'Giá Sàn', referencePrice: 'Giá TC' }
const SOURCE_LABELS = { vps: 'VPS', kbs: 'KBS', vndirect: 'VNDirect', tcbs: 'TCBS' }

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

function AlertCard({ alert, onAcknowledge, onResolve, acting }) {
  const isActing    = acting === alert._id
  const isCritical  = alert.severity === 'critical'
  const borderColor = SEVERITY_BORDER[alert.severity] ?? 'border-l-gray-300'
  const cardBg      = SEVERITY_BG[alert.severity]     ?? ''

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100 border-l-4 shadow-sm overflow-hidden transition-shadow hover:shadow-md',
      borderColor, cardBg
    )}>
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-lg font-bold text-gray-900 tracking-wide">{alert.symbol}</span>
          <AlertBadge type={alert.severity} />
          <AlertBadge type={alert.status} />
          {alert.exchange && (
            <span className="text-xs text-gray-400 font-medium">{alert.exchange}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {dayjs(alert.createdAt).format('HH:mm · DD/MM/YYYY')}
        </span>
      </div>

      {/* Price details */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Loại giá</p>
          <p className="text-sm font-semibold text-gray-800">
            {FIELD_LABELS[alert.discrepancyType] ?? alert.discrepancyType}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Chênh lệch</p>
          <p className={cn('text-sm font-bold', isCritical ? 'text-red-600' : 'text-amber-600')}>
            {alert.differencePercent?.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">KIS</p>
          <p className="text-sm font-semibold text-gray-700 tabular-nums">
            {alert.sources?.kisValue?.toLocaleString('vi-VN') ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">
            {SOURCE_LABELS[alert.sources?.source] ?? alert.sources?.source ?? 'Nguồn'}
          </p>
          <p className="text-sm font-semibold text-red-600 tabular-nums">
            {alert.sources?.sourceValue?.toLocaleString('vi-VN') ?? '—'}
          </p>
        </div>
      </div>

      {/* Resolution note */}
      {alert.resolution && (
        <div className="px-5 pb-3 -mt-1">
          <p className="text-xs text-gray-500 italic bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            Xử lý: {alert.resolution}
          </p>
        </div>
      )}

      {/* Actions */}
      {alert.status !== 'resolved' && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/60">
          {alert.status === 'open' && (
            <button
              onClick={() => onAcknowledge(alert._id)}
              disabled={isActing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
            >
              <Clock size={12} strokeWidth={2} />
              Ghi nhận
            </button>
          )}
          <button
            onClick={() => onResolve(alert._id)}
            disabled={isActing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 size={12} strokeWidth={2} />
            Đánh dấu xử lý
          </button>
          {isActing && (
            <span className="text-xs text-gray-400 ml-1">Đang xử lý...</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function Alerts() {
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(null)

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
  const pageNumbers = () => {
    const delta = 2
    const range = []
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) range.push(i)
    return range
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
            <Bell size={16} className="text-red-500" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Cảnh báo</h1>
            <p className="text-xs text-gray-400">
              {loading ? '...' : <><strong className="text-gray-600">{total}</strong> cảnh báo</>}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        {!loading && total > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
              <ShieldAlert size={11} strokeWidth={2.5} />
              {data.filter(a => a.severity === 'critical').length} critical
            </span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium uppercase tracking-wide">
            <SlidersHorizontal size={12} strokeWidth={2} />
            Bộ lọc
          </div>

          <Select
            value={filters.status}
            onChange={v => setFilters(f => ({ ...f, status: v }))}
            placeholder="Tất cả trạng thái"
            className="w-44"
          >
            <SelectOption value="">Tất cả trạng thái</SelectOption>
            <SelectOption value="open">Đang mở</SelectOption>
            <SelectOption value="acknowledged">Đã ghi nhận</SelectOption>
            <SelectOption value="resolved">Đã xử lý</SelectOption>
          </Select>

          <Select
            value={filters.severity}
            onChange={v => setFilters(f => ({ ...f, severity: v }))}
            placeholder="Tất cả mức độ"
            className="w-40"
          >
            <SelectOption value="">Tất cả mức độ</SelectOption>
            <SelectOption value="critical">Critical</SelectOption>
            <SelectOption value="warning">Warning</SelectOption>
            <SelectOption value="info">Info</SelectOption>
          </Select>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Tìm mã..."
              value={filters.symbol}
              onChange={e => setFilters(f => ({ ...f, symbol: e.target.value }))}
              className="border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-sm w-32 bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="flex gap-2">
                  <div className="h-5 w-12 bg-gray-100 rounded-full" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                  <div className="h-5 w-14 bg-gray-100 rounded-full" />
                </div>
                <div className="h-4 w-24 bg-gray-100 rounded" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[0,1,2,3].map(j => (
                  <div key={j}>
                    <div className="h-3 w-14 bg-gray-100 rounded mb-1.5" />
                    <div className="h-4 w-20 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle2 size={26} className="text-green-500" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Không có cảnh báo nào</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {filters.status === 'open' ? 'Tất cả giá đang khớp nhau' : 'Không tìm thấy kết quả phù hợp'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(a => (
            <AlertCard
              key={a._id}
              alert={a}
              onAcknowledge={acknowledge}
              onResolve={resolve}
              acting={acting}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Trang <strong className="text-gray-600">{page}</strong> / {totalPages}
            {' '}· <strong className="text-gray-600">{total}</strong> cảnh báo
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
