import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  ScrollText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  Bell,
  Clock,
  Check,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Database,
  AlertTriangle,
  Timer,
  Bot,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectOption } from '@/components/ui/Select'
import api from '../services/api'

const PAGE_SIZE = 50

const ACTION_CONFIG = {
  scheduler_started:     { icon: Bot,          color: 'text-slate-500',  bg: 'bg-slate-50',   labelKey: 'audit.actionSchedulerStarted'  },
  daily_sync_started:    { icon: RefreshCw,    color: 'text-blue-500',   bg: 'bg-blue-50',    labelKey: 'audit.actionSyncStarted'        },
  daily_sync_completed:  { icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-50',   labelKey: 'audit.actionSyncCompleted'      },
  daily_sync_failed:     { icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50',     labelKey: 'audit.actionSyncFailed'         },
  manual_sync_triggered: { icon: Zap,          color: 'text-violet-500', bg: 'bg-violet-50',  labelKey: 'audit.actionManualSync'         },
  comparison_completed:  { icon: BarChart3,    color: 'text-blue-500',   bg: 'bg-blue-50',    labelKey: 'audit.actionComparisonCompleted'},
  alert_created:         { icon: Bell,         color: 'text-amber-500',  bg: 'bg-amber-50',   labelKey: 'audit.actionAlertCreated'       },
  alert_acknowledged:    { icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-50',   labelKey: 'audit.actionAlertAcknowledged'  },
  alert_resolved:        { icon: Check,        color: 'text-green-500',  bg: 'bg-green-50',   labelKey: 'audit.actionAlertResolved'      }
}

const STATUS_CONFIG = {
  success: { labelKey: 'audit.statusSuccess', bg: 'bg-green-50',  text: 'text-green-700', border: 'border-green-200' },
  partial: { labelKey: 'audit.statusPartial', bg: 'bg-amber-50',  text: 'text-amber-700', border: 'border-amber-200' },
  failed:  { labelKey: 'audit.statusFailed',  bg: 'bg-red-50',    text: 'text-red-700',   border: 'border-red-200'   }
}

function ActionCell({ action }) {
  const { t } = useTranslation()
  const cfg = ACTION_CONFIG[action]
  if (!cfg) return <span className="text-xs text-gray-500">{action}</span>
  const Icon = cfg.icon
  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
        <Icon size={13} className={cfg.color} strokeWidth={2} />
      </div>
      <span className="text-sm font-medium text-gray-700">{t(cfg.labelKey)}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
  const c = STATUS_CONFIG[status]
  if (!c) return <span className="text-xs text-gray-400">{status}</span>
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium border', c.bg, c.text, c.border)}>
      {t(c.labelKey)}
    </span>
  )
}

function TriggeredBy({ value }) {
  const { t } = useTranslation()
  if (value === 'scheduler') return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Bot size={12} className="text-blue-400" strokeWidth={2} />
      {t('audit.triggeredAuto')}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <User size={12} className="text-violet-400" strokeWidth={2} />
      {t('audit.triggeredManual')}
    </span>
  )
}

function DetailChip({ icon: Icon, label, value, color = 'text-gray-500' }) {
  if (value == null || value === '') return null
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 text-xs text-gray-500 whitespace-nowrap">
      <Icon size={10} className={color} strokeWidth={2} />
      {label && <span className="text-gray-400">{label}</span>}
      <span className={cn('font-medium', color)}>{value}</span>
    </span>
  )
}

function DetailCell({ details }) {
  const { t } = useTranslation()
  if (!details) return <span className="text-gray-300">—</span>
  const chips = []

  if (details.sources?.length) {
    chips.push(
      <span key="sources" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <Database size={10} className="text-slate-400" strokeWidth={2} />
        <span className="font-medium">{details.sources.join(' · ')}</span>
      </span>
    )
    if (details.syncTime)
      chips.push(<DetailChip key="time" icon={Timer} label={t('audit.detailSyncAt')} value={details.syncTime} color="text-gray-400" />)
    return <div className="flex flex-wrap gap-1">{chips}</div>
  }

  if (details.date)
    chips.push(<DetailChip key="date" icon={Calendar} label="" value={details.date} color="text-gray-500" />)

  if (details.kis?.total != null)
    chips.push(<DetailChip key="kis" icon={Database} label="KIS" value={details.kis.total.toLocaleString()} color="text-blue-500" />)

  if (details.vps?.total != null)
    chips.push(<DetailChip key="vps" icon={Database} label="VPS" value={details.vps.total.toLocaleString()} color="text-violet-500" />)

  if (details.kbs?.total != null)
    chips.push(<DetailChip key="kbs" icon={Database} label="KBS" value={details.kbs.total.toLocaleString()} color="text-teal-500" />)

  if (details.comparison?.withDiscrepancy != null)
    chips.push(
      <DetailChip
        key="disc"
        icon={AlertTriangle}
        label={t('audit.detailDiscrepancy')}
        value={details.comparison.withDiscrepancy}
        color={details.comparison.withDiscrepancy > 0 ? 'text-red-500' : 'text-green-500'}
      />
    )

  if (details.durationMs != null) {
    const secs = (details.durationMs / 1000).toFixed(0)
    chips.push(<DetailChip key="dur" icon={Timer} label="" value={`${secs}s`} color="text-gray-400" />)
  }

  if (details.error)
    chips.push(
      <span key="err" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-100 text-xs text-red-500">
        <XCircle size={10} strokeWidth={2} />
        {details.error}
      </span>
    )

  if (chips.length === 0) return <span className="text-gray-300">—</span>
  return <div className="flex flex-wrap gap-1">{chips}</div>
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

export default function AuditLog() {
  const { t } = useTranslation()
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
  const pageNumbers = () => {
    const delta = 2, range = []
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) range.push(i)
    return range
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <ScrollText size={16} className="text-gray-500" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t('audit.title')}</h1>
            <p className="text-xs text-gray-400">
              {loading ? '...' : <><strong className="text-gray-600">{total.toLocaleString()}</strong> {t('audit.recordCount', { count: '' }).trim()}</>}
            </p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium uppercase tracking-wide">
            <SlidersHorizontal size={12} strokeWidth={2} />
            {t('audit.filter')}
          </div>
          <Select
            value={filters.action}
            onChange={v => setFilters(f => ({ ...f, action: v }))}
            placeholder={t('audit.allActions')}
            className="w-52"
          >
            <SelectOption value="">{t('audit.allActions')}</SelectOption>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <SelectOption key={k} value={k}>{t(v.labelKey)}</SelectOption>
            ))}
          </Select>

          <Select
            value={filters.status}
            onChange={v => setFilters(f => ({ ...f, status: v }))}
            placeholder={t('audit.allStatus')}
            className="w-44"
          >
            <SelectOption value="">{t('audit.allStatus')}</SelectOption>
            <SelectOption value="success">{t('audit.statusSuccess')}</SelectOption>
            <SelectOption value="partial">{t('audit.statusPartial')}</SelectOption>
            <SelectOption value="failed">{t('audit.statusFailed')}</SelectOption>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm">{t('audit.loading')}</span>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center">
                <ScrollText size={26} className="text-gray-300" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-gray-400">{t('audit.noData')}</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[800px]">
              <thead className="sticky top-0 z-10">
                <tr className="text-left bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 font-medium text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap">{t('audit.colTime')}</th>
                  <th className="px-4 py-3 font-medium text-xs text-gray-500 uppercase tracking-wide">{t('audit.colAction')}</th>
                  <th className="px-4 py-3 font-medium text-xs text-gray-500 uppercase tracking-wide">{t('audit.colStatus')}</th>
                  <th className="px-4 py-3 font-medium text-xs text-gray-500 uppercase tracking-wide">{t('audit.colSource')}</th>
                  <th className="px-4 py-3 font-medium text-xs text-gray-500 uppercase tracking-wide">{t('audit.colDetail')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors duration-100">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap font-mono">
                      <span className="block">{dayjs(log.timestamp).format('DD/MM/YYYY')}</span>
                      <span className="text-gray-300">{dayjs(log.timestamp).format('HH:mm:ss')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ActionCell action={log.action} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3">
                      <TriggeredBy value={log.triggeredBy} />
                    </td>
                    <td className="px-4 py-3">
                      <DetailCell details={log.details} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {t('audit.page', { current: page, total: totalPages })}
            {' · '}<strong className="text-gray-600">{total.toLocaleString()}</strong> {t('audit.pageRecords', { count: '' }).trim()}
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
