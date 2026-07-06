import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  Bell,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  X,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectOption } from '@/components/ui/Select'
import api from '../services/api'
import AlertBadge from '../components/AlertBadge'

const PAGE_SIZE = 20

const SEVERITY_CONFIG = {
  critical: { cardBg: 'var(--tint-red)',   leftColor: 'var(--red)',   diffColor: 'var(--red-strong)' },
  warning:  { cardBg: 'var(--tint-amber)', leftColor: 'var(--amber)', diffColor: 'var(--amber-strong)' },
  info:     { cardBg: 'var(--tint-blue)',  leftColor: 'var(--blue)',  diffColor: 'var(--blue)'       }
}
const DEFAULT_SEV = { cardBg: 'var(--card)', leftColor: 'var(--bd2)', diffColor: 'var(--t-mid)' }

const SOURCE_LABELS = { vps: 'VPS', kbs: 'KBS', vndirect: 'VNDirect', tcbs: 'TCBS' }

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-5 right-5 z-[60] animate-in slide-in-from-right-4 fade-in duration-300">
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
        }}
        className="flex items-center gap-3 rounded-xl px-4 py-3 min-w-[260px] max-w-sm"
      >
        <div
          style={{ background: 'var(--tint-green)' }}
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        >
          <CheckCircle2 size={15} style={{ color: 'var(--green-strong)' }} strokeWidth={2.5} />
        </div>
        <p style={{ color: 'var(--t-body)' }} className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="icon-btn shrink-0">
          <X size={14} strokeWidth={2} />
        </button>
      </div>
      <div
        style={{ background: 'color-mix(in srgb, var(--green) 15%, transparent)' }}
        className="mt-1 mx-1 h-0.5 rounded-full overflow-hidden"
      >
        <div
          style={{ background: 'var(--green)' }}
          className="h-full rounded-full animate-[shrink_3s_linear_forwards]"
        />
      </div>
    </div>
  )
}

// ─── Reusable Modal Shell ─────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--modal)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
          border: '1px solid var(--bd)'
        }}
        className="rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-150"
      >
        {children}
      </div>
    </div>
  )
}

// ─── Acknowledge Confirmation Modal ──────────────────────────────────────────
function AcknowledgeModal({ open, symbol, onClose, onConfirm, loading }) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ borderBottom: '1px solid var(--bd)' }} className="flex items-start justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div style={{ background: 'var(--tint-amber)' }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={18} style={{ color: 'var(--amber)' }} strokeWidth={2} />
          </div>
          <h2 style={{ color: 'var(--t-strong)' }} className="text-base font-semibold">{t('alerts.ackModalTitle')}</h2>
        </div>
        <button onClick={onClose} className="icon-btn mt-0.5">
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-3">
        <p
          style={{ color: 'var(--t-body)' }}
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: t('alerts.ackModalBody', { symbol }) }}
        />
        <div
          style={{
            background: 'var(--tint-amber)',
            border: '1px solid color-mix(in srgb, var(--amber) 25%, transparent)'
          }}
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
        >
          <AlertTriangle size={14} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" strokeWidth={2} />
          <p style={{ color: 'var(--amber-strong)' }} className="text-xs">{t('alerts.ackModalNote')}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-6 pb-5">
        <button
          onClick={onClose}
          disabled={loading}
          className="modal-cancel px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {t('alerts.cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          <Clock size={13} strokeWidth={2} />
          {loading ? t('alerts.processing') : t('alerts.confirmAck')}
        </button>
      </div>
    </Modal>
  )
}

// ─── Resolve Modal ────────────────────────────────────────────────────────────
function ResolveModal({ open, symbol, onClose, onConfirm, loading }) {
  const { t } = useTranslation()
  const [note, setNote]       = useState('')
  const [error, setError]     = useState(false)
  const textareaRef           = useRef(null)

  useEffect(() => {
    if (open) {
      setNote('')
      setError(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  const handleConfirm = () => {
    if (!note.trim()) { setError(true); return }
    onConfirm(note.trim())
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ borderBottom: '1px solid var(--bd)' }} className="flex items-start justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div style={{ background: 'var(--tint-green)' }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} style={{ color: 'var(--green-strong)' }} strokeWidth={2} />
          </div>
          <h2 style={{ color: 'var(--t-strong)' }} className="text-base font-semibold">{t('alerts.resolveModalTitle')}</h2>
        </div>
        <button onClick={onClose} className="icon-btn mt-0.5">
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-3">
        <p
          style={{ color: 'var(--t-body)' }}
          className="text-sm"
          dangerouslySetInnerHTML={{ __html: t('alerts.resolveModalBody', { symbol }) }}
        />
        <div>
          <label style={{ color: 'var(--t-faint)' }} className="block text-xs font-medium mb-1.5">
            {t('alerts.resolveLabel')}
            <span style={{ color: 'var(--red)' }} className="ml-0.5">*</span>
          </label>
          <textarea
            ref={textareaRef}
            value={note}
            onChange={e => { setNote(e.target.value); if (error) setError(false) }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleConfirm() }}
            placeholder={t('alerts.resolvePlaceholder')}
            rows={3}
            style={error ? {
              borderColor: 'var(--red)',
              background: 'color-mix(in srgb, var(--tint-red) 60%, var(--card))',
              color: 'var(--t-body)'
            } : {
              borderColor: 'var(--bd2)',
              background: 'var(--bd)',
              color: 'var(--t-body)'
            }}
            className="w-full text-sm border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 transition-all"
          />
          {error && (
            <p style={{ color: 'var(--red-strong)' }} className="text-xs mt-1">{t('alerts.resolveRequired')}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-6 pb-5">
        <button
          onClick={onClose}
          disabled={loading}
          className="modal-cancel px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {t('alerts.cancel')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          <CheckCircle2 size={13} strokeWidth={2} />
          {loading ? t('alerts.processing') : t('alerts.confirmResolve')}
        </button>
      </div>
    </Modal>
  )
}

// ─── Pagination Button ────────────────────────────────────────────────────────
function PaginationButton({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors',
        active
          ? 'bg-blue-600 text-white font-medium shadow-sm'
          : 'page-btn disabled:opacity-40 disabled:cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, onAcknowledge, onResolve, acting }) {
  const { t } = useTranslation()
  const isActing = acting === alert._id
  const sev      = SEVERITY_CONFIG[alert.severity] ?? DEFAULT_SEV

  const fieldLabels = {
    ceilingPrice:   t('alerts.fieldCeiling'),
    floorPrice:     t('alerts.fieldFloor'),
    referencePrice: t('alerts.fieldReference')
  }

  return (
    <div
      style={{
        background:   sev.cardBg,
        borderWidth:  '1px 1px 1px 4px',
        borderStyle:  'solid',
        borderColor:  `var(--bd) var(--bd) var(--bd) ${sev.leftColor}`,
        borderRadius: '0.75rem',
        overflow:     'hidden'
      }}
      className="shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div
        style={{ borderBottom: '1px solid color-mix(in srgb, var(--bd2) 70%, transparent)' }}
        className="flex items-center justify-between px-5 py-3.5"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span style={{ color: 'var(--t-strong)' }} className="text-lg font-bold tracking-wide">
            {alert.symbol}
          </span>
          <AlertBadge type={alert.severity} />
          <AlertBadge type={alert.status} />
          {alert.exchange && (
            <span style={{ color: 'var(--t-faint)' }} className="text-xs font-medium">
              {alert.exchange}
            </span>
          )}
        </div>
        <span style={{ color: 'var(--t-faint)' }} className="text-xs shrink-0">
          {dayjs(alert.createdAt).format('HH:mm · DD/MM/YYYY')}
        </span>
      </div>

      {/* Data grid */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p style={{ color: 'var(--t-faint)' }} className="text-xs mb-0.5">{t('alerts.priceType')}</p>
          <p style={{ color: 'var(--t-strong)' }} className="text-sm font-semibold">
            {fieldLabels[alert.discrepancyType] ?? alert.discrepancyType}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--t-faint)' }} className="text-xs mb-0.5">{t('alerts.diffPct')}</p>
          <p style={{ color: sev.diffColor }} className="text-sm font-bold">
            {alert.differencePercent?.toFixed(2)}%
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--t-faint)' }} className="text-xs mb-0.5">{t('alerts.kisValue')}</p>
          <p style={{ color: 'var(--t-body)' }} className="text-sm font-semibold tabular-nums">
            {alert.sources?.kisValue?.toLocaleString('vi-VN') ?? '—'}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--t-faint)' }} className="text-xs mb-0.5">
            {SOURCE_LABELS[alert.sources?.source] ?? alert.sources?.source ?? '—'}
          </p>
          <p style={{ color: 'var(--red-strong)' }} className="text-sm font-semibold tabular-nums">
            {alert.sources?.sourceValue?.toLocaleString('vi-VN') ?? '—'}
          </p>
        </div>
      </div>

      {/* Resolution note */}
      {alert.resolution && (
        <div className="px-5 pb-3 -mt-1">
          <p
            style={{
              color:      'var(--t-mid)',
              background: 'rgba(0,0,0,0.04)',
              border:     '1px solid var(--bd)'
            }}
            className="text-xs italic px-3 py-1.5 rounded-lg"
          >
            {t('alerts.resolution', { text: alert.resolution })}
          </p>
        </div>
      )}

      {/* Action row */}
      {alert.status !== 'resolved' && (
        <div
          style={{ borderTop: '1px solid color-mix(in srgb, var(--bd2) 60%, transparent)' }}
          className="flex items-center gap-2 px-5 py-3"
        >
          {alert.status === 'open' && (
            <button
              onClick={() => onAcknowledge(alert)}
              disabled={isActing}
              className="alert-btn-ack inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              <Clock size={12} strokeWidth={2} />
              {t('alerts.acknowledge')}
            </button>
          )}
          <button
            onClick={() => onResolve(alert)}
            disabled={isActing}
            className="alert-btn-res inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 size={12} strokeWidth={2} />
            {t('alerts.markResolved')}
          </button>
          {isActing && (
            <span style={{ color: 'var(--t-faint)' }} className="text-xs ml-1">{t('alerts.processing')}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Alerts() {
  const { t } = useTranslation()
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(null)
  const [filters, setFilters] = useState({ status: 'open', severity: '', symbol: '' })

  const [ackModal,     setAckModal]     = useState(null)
  const [resolveModal, setResolveModal] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = useCallback((msg) => setToast(msg), [])

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

  const handleAcknowledgeClick = (alert) => setAckModal({ id: alert._id, symbol: alert.symbol })
  const handleResolveClick     = (alert) => setResolveModal({ id: alert._id, symbol: alert.symbol })

  const confirmAcknowledge = async () => {
    const { id, symbol } = ackModal
    setModalLoading(true); setActing(id)
    try {
      await api.alerts.acknowledge(id, { acknowledgedBy: 'user' })
      setAckModal(null)
      showToast(t('alerts.toastAckSuccess', { symbol }))
      load(page)
    } catch (e) { console.error(e) }
    finally { setModalLoading(false); setActing(null) }
  }

  const confirmResolve = async (note) => {
    const { id, symbol } = resolveModal
    setModalLoading(true); setActing(id)
    try {
      await api.alerts.resolve(id, { resolvedBy: 'user', resolution: note })
      setResolveModal(null)
      showToast(t('alerts.toastResolveSuccess', { symbol }))
      load(page)
    } catch (e) { console.error(e) }
    finally { setModalLoading(false); setActing(null) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const pageNumbers = () => {
    const delta = 2, range = []
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) range.push(i)
    return range
  }

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Modals */}
      <AcknowledgeModal
        open={!!ackModal}
        symbol={ackModal?.symbol}
        onClose={() => setAckModal(null)}
        onConfirm={confirmAcknowledge}
        loading={modalLoading}
      />
      <ResolveModal
        open={!!resolveModal}
        symbol={resolveModal?.symbol}
        onClose={() => setResolveModal(null)}
        onConfirm={confirmResolve}
        loading={modalLoading}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--tint-red)' }} className="w-8 h-8 rounded-lg flex items-center justify-center">
            <Bell size={16} style={{ color: 'var(--red-strong)' }} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ color: 'var(--t-strong)' }} className="text-xl font-semibold">{t('alerts.title')}</h1>
            <p style={{ color: 'var(--t-faint)' }} className="text-xs">
              {loading ? '...' : (
                <><strong style={{ color: 'var(--t-body)' }}>{total}</strong> {t('alerts.alertCount', { count: '' }).trim()}</>
              )}
            </p>
          </div>
        </div>
        {!loading && total > 0 && (
          <span
            style={{
              background: 'var(--tint-red)',
              color:      'var(--red-strong)',
              border:     '1px solid color-mix(in srgb, var(--red) 25%, transparent)'
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
          >
            <ShieldAlert size={11} strokeWidth={2.5} />
            {data.filter(a => a.severity === 'critical').length} {t('alerts.critical')}
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div style={{ color: 'var(--t-faint)' }} className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
            <SlidersHorizontal size={12} strokeWidth={2} />
            {t('alerts.filter')}
          </div>

          <Select
            value={filters.status}
            onChange={v => setFilters(f => ({ ...f, status: v }))}
            placeholder={t('alerts.allStatus')}
            className="w-44"
          >
            <SelectOption value="">{t('alerts.allStatus')}</SelectOption>
            <SelectOption value="open">{t('alerts.statusOpen')}</SelectOption>
            <SelectOption value="acknowledged">{t('alerts.statusAcknowledged')}</SelectOption>
            <SelectOption value="resolved">{t('alerts.statusResolved')}</SelectOption>
          </Select>

          <Select
            value={filters.severity}
            onChange={v => setFilters(f => ({ ...f, severity: v }))}
            placeholder={t('alerts.allSeverity')}
            className="w-40"
          >
            <SelectOption value="">{t('alerts.allSeverity')}</SelectOption>
            <SelectOption value="critical">{t('alerts.severityCritical')}</SelectOption>
            <SelectOption value="warning">{t('alerts.severityWarning')}</SelectOption>
            <SelectOption value="info">{t('alerts.severityInfo')}</SelectOption>
          </Select>

          <div className="relative">
            <Search size={13} style={{ color: 'var(--t-faint)' }} className="absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input
              type="text"
              placeholder={t('alerts.searchSymbol')}
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
          {[0,1,2].map(i => (
            <div
              key={i}
              style={{ background: 'var(--card)', border: '1px solid var(--bd)' }}
              className="rounded-xl shadow-sm p-5 animate-pulse"
            >
              <div className="flex justify-between mb-4">
                <div className="flex gap-2">
                  {[12,16,14].map((w, j) => (
                    <div key={j} style={{ background: 'var(--bd)', width: `${w * 4}px` }} className="h-5 rounded-full" />
                  ))}
                </div>
                <div style={{ background: 'var(--bd)' }} className="h-4 w-24 rounded" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[0,1,2,3].map(j => (
                  <div key={j}>
                    <div style={{ background: 'var(--bd)' }} className="h-3 w-14 rounded mb-1.5" />
                    <div style={{ background: 'var(--bd)' }} className="h-4 w-20 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div
          style={{ background: 'var(--card)', border: '1px solid var(--bd)' }}
          className="rounded-xl shadow-sm flex flex-col items-center justify-center py-20 gap-3"
        >
          <div style={{ background: 'var(--tint-green)' }} className="w-14 h-14 rounded-full flex items-center justify-center">
            <CheckCircle2 size={26} style={{ color: 'var(--green-strong)' }} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p style={{ color: 'var(--t-body)' }} className="text-sm font-medium">{t('alerts.noAlerts')}</p>
            <p style={{ color: 'var(--t-faint)' }} className="text-xs mt-0.5">
              {filters.status === 'open' ? t('alerts.noAlertsOpen') : t('alerts.noAlertsFilter')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(a => (
            <AlertCard
              key={a._id}
              alert={a}
              onAcknowledge={handleAcknowledgeClick}
              onResolve={handleResolveClick}
              acting={acting}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p style={{ color: 'var(--t-faint)' }} className="text-xs">
            {t('alerts.page', { current: page, total: totalPages })}
            {' · '}<strong style={{ color: 'var(--t-body)' }}>{total}</strong> {t('alerts.pageAlerts', { count: '' }).trim()}
          </p>
          <div className="flex items-center gap-1">
            <PaginationButton onClick={() => load(page - 1)} disabled={page === 1}><ChevronLeft size={14} /></PaginationButton>
            {pageNumbers().map(n => (
              <PaginationButton key={n} onClick={() => load(n)} active={n === page}>{n}</PaginationButton>
            ))}
            <PaginationButton onClick={() => load(page + 1)} disabled={page === totalPages}><ChevronRight size={14} /></PaginationButton>
          </div>
        </div>
      )}
    </div>
  )
}
