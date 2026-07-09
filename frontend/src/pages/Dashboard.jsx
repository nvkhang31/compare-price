import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  Database,
  ArrowLeftRight,
  Bell,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Activity,
  BarChart3,
  TrendingDown,
  Info
} from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import api from '../services/api'
import StatsCard from '../components/StatsCard'
import AlertBadge from '../components/AlertBadge'
import { cn } from '@/lib/utils'

const SOURCE_DISPLAY = { vps: 'VPS', vndirect: 'VNDirect', tcbs: 'TCBS', ssi: 'SSI' }
const SOURCE_BAR     = { vps: 'var(--blue)', vndirect: 'var(--violet)', tcbs: 'var(--teal)', ssi: 'var(--green)' }
const SOURCE_TINT    = { vps: 'var(--tint-blue)', vndirect: 'var(--tint-violet)', tcbs: 'var(--tint-teal)', ssi: 'var(--tint-green)' }

function ChartTooltip({ active, payload, label }) {
  const { t } = useTranslation()
  if (!active || !payload?.length) return null
  const disc = payload.find(p => p.dataKey === 'discrepancies')
  const mr   = payload.find(p => p.dataKey === 'matchRate')
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--bd)' }} className="shadow-lg rounded-lg px-3 py-2 text-sm">
      <p style={{ color: 'var(--t-faint)' }} className="text-xs mb-1">{label}</p>
      {disc && (
        <p style={{ color: 'var(--t-strong)' }} className="font-semibold">
          {disc.value}{' '}
          <span style={{ color: 'var(--t-mid)' }} className="font-normal">{t('dashboard.chartTooltipLabel')}</span>
        </p>
      )}
      {mr && (
        <p style={{ color: 'var(--green-strong)' }} className="text-xs mt-0.5">
          Match rate: {mr.value?.toFixed(1)}%
        </p>
      )}
    </div>
  )
}

function SourcePill({ source }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
      <CheckCircle2 size={11} strokeWidth={2.5} />
      {source.toUpperCase()}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-100 rounded w-28" />
        <div className="w-9 h-9 bg-gray-100 rounded-lg" />
      </div>
      <div className="h-8 bg-gray-100 rounded w-16 mt-3" />
      <div className="h-3 bg-gray-50 rounded w-24 mt-2" />
    </div>
  )
}

function SourceBreakdown({ data, loading }) {
  const { t } = useTranslation()
  const maxCount = Math.max(...(data?.sourceStats?.map(s => s.count) ?? [0]), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--tint-violet)', border: '1px solid color-mix(in srgb, var(--violet) 30%, transparent)' }}>
          <BarChart3 size={14} style={{ color: 'var(--violet)' }} strokeWidth={2} />
        </div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-gray-800">{t('dashboard.sourceBreakdownTitle')}</h2>
          <div className="relative group cursor-help">
            <Info size={13} strokeWidth={2} style={{ color: 'var(--t-faint)' }} />
            <div className="absolute left-0 bottom-full mb-2 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ background: 'rgba(15,20,30,0.92)', color: '#e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              {t('dashboard.sourceBreakdownSub')}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className="h-8 bg-gray-50 rounded-lg animate-pulse" />)}
        </div>
      ) : !data?.sourceStats?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 bg-green-50 ring-4 ring-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 size={22} className="text-green-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-600">{t('dashboard.sourceBreakdownEmpty')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.sourceBreakdownEmptySub')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.sourceStats.map(({ source, count }) => {
            const barColor  = SOURCE_BAR[source]  ?? 'var(--blue)'
            const tintColor = SOURCE_TINT[source] ?? 'var(--tint-blue)'
            const label     = SOURCE_DISPLAY[source] ?? source.toUpperCase()
            const pct       = Math.round((count / maxCount) * 100)
            return (
              <div key={source} className="flex items-center gap-3">
                <span className="text-xs font-semibold w-16 shrink-0 text-right" style={{ color: 'var(--t-mid)' }}>
                  {label}
                </span>
                <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: 'var(--bd)' }}>
                  <div
                    className="h-full rounded-md transition-all duration-700"
                    style={{ width: `${pct}%`, background: tintColor, minWidth: '2rem' }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums w-6 shrink-0 text-right" style={{ color: barColor }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TopSymbols({ data, loading }) {
  const { t } = useTranslation()
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--tint-red)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)' }}>
          <TrendingDown size={14} style={{ color: 'var(--red)' }} strokeWidth={2} />
        </div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-gray-800">{t('dashboard.topSymbolsTitle')}</h2>
          <div className="relative group cursor-help">
            <Info size={13} strokeWidth={2} style={{ color: 'var(--t-faint)' }} />
            <div className="absolute left-0 bottom-full mb-2 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ background: 'rgba(15,20,30,0.92)', color: '#e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              {t('dashboard.topSymbolsSub')}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3,4].map(i => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
        </div>
      ) : !data?.topSymbols?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 bg-green-50 ring-4 ring-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 size={22} className="text-green-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-600">{t('dashboard.topSymbolsEmpty')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.topSymbolsEmptySub')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <th className="pb-2.5 text-left w-8" style={{ color: 'var(--t-faint)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>#</th>
                <th className="pb-2.5 text-left" style={{ color: 'var(--t-faint)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('dashboard.colSymbol')}</th>
                <th className="pb-2.5 text-left" style={{ color: 'var(--t-faint)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('dashboard.colExchange')}</th>
                <th className="pb-2.5 text-left" style={{ color: 'var(--t-faint)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('dashboard.colSources')}</th>
                <th className="pb-2.5 text-right" style={{ color: 'var(--t-faint)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('dashboard.colMaxDiff')}</th>
              </tr>
            </thead>
            <tbody>
              {data.topSymbols.map(({ symbol, exchange, maxDiffPct, discrepantSources }, idx) => (
                <tr key={symbol} className="audit-row" style={{ borderBottom: '1px solid var(--bd)' }}>
                  <td className="py-2.5 pr-2" style={{ color: 'var(--t-ghost)', fontSize: '11px' }}>{idx + 1}</td>
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold text-sm" style={{ color: 'var(--t-strong)' }}>{symbol}</span>
                  </td>
                  <td className="py-2.5 pr-3">
                    {exchange && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bd)', color: 'var(--t-mid)' }}>
                        {exchange}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs" style={{ color: 'var(--t-mid)' }}>
                      {discrepantSources?.map(s => SOURCE_DISPLAY[s] ?? s.toUpperCase()).join(', ')}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="font-semibold text-sm" style={{ color: 'var(--red-strong)' }}>
                      {maxDiffPct?.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const [stats,         setStats]         = useState(null)
  const [alerts,        setAlerts]        = useState([])
  const [trendData,     setTrendData]     = useState([])
  const [discDelta,     setDiscDelta]     = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const today = dayjs().format('YYYY-MM-DD')

        const [statsRes, alertRes, analyticsRes] = await Promise.all([
          api.stats(),
          api.alerts.list({ status: 'open', limit: 5 }),
          api.comparisons.analytics({ date: today })
        ])
        setStats(statsRes.data)
        setAlerts(alertRes.data)
        setAnalyticsData(analyticsRes.data)

        const trend = []
        for (let i = 6; i >= 0; i--) {
          const d   = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
          const res = await api.comparisons.summary({ date: d })
          trend.push({
            date:          dayjs(d).format('DD/MM'),
            discrepancies: res.data?.withDiscrepancy ?? 0,
            matchRate:     res.data?.matchRate ?? 100
          })
        }
        setTrendData(trend)

        if (trend.length >= 2) {
          setDiscDelta(
            trend[trend.length - 1].discrepancies - trend[trend.length - 2].discrepancies
          )
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const dateLocale = i18n.language === 'vi' ? 'vi' : 'en'
  const s = stats ?? {}

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {dayjs().locale(dateLocale).format(i18n.language === 'vi' ? 'dddd, DD/MM/YYYY' : 'dddd, MMMM D, YYYY')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {s.sourcesAvailable?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap justify-end">
              {s.sourcesAvailable.map(src => (
                <SourcePill key={src} source={src} />
              ))}
            </div>
          )}
          {s.lastSyncAt ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              {t('dashboard.lastSync', { time: dayjs(s.lastSyncAt).format('HH:mm DD/MM') })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              {t('dashboard.noSync')}
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatsCard
            title={t('dashboard.symbolsTracked')}
            value={s.symbolsTracked ?? 0}
            color="blue"
            icon={Database}
            sub={t('dashboard.dataSources', { count: s.sourcesAvailable?.length ?? 0 })}
          />
          <StatsCard
            title={t('dashboard.discrepanciesToday')}
            value={s.discrepanciesToday ?? 0}
            color={s.discrepanciesToday > 0 ? 'red' : 'green'}
            icon={ArrowLeftRight}
            sub={s.matchRate != null
              ? t('dashboard.matchRate', { value: s.matchRate })
              : t('dashboard.waitingCompare')}
            gauge={s.matchRate}
            delta={s.comparisonTotal > 0 ? discDelta : null}
          />
          <StatsCard
            title={t('dashboard.openAlerts')}
            value={s.openAlerts ?? 0}
            color={s.openAlerts > 0 ? 'yellow' : 'green'}
            icon={Bell}
            sub={t('dashboard.unresolved')}
          />
          <StatsCard
            title={t('dashboard.critical')}
            value={s.criticalAlerts ?? 0}
            color={s.criticalAlerts > 0 ? 'red' : 'gray'}
            icon={ShieldAlert}
            sub={t('dashboard.criticalSub')}
          />
        </div>
      )}

      {/* Warning: limited sources */}
      {!loading && s.sourcesAvailable && s.sourcesAvailable.length < 3 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" strokeWidth={2} />
          <span dangerouslySetInnerHTML={{
            __html: t('dashboard.limitedSources', {
              sources: s.sourcesAvailable.map(x => x.toUpperCase()).join(', ')
            })
          }} />
        </div>
      )}

      {/* Chart + Alerts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Trend chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--tint-blue)', border: '1px solid color-mix(in srgb, var(--blue) 30%, transparent)' }}>
                <Activity size={14} style={{ color: 'var(--blue)' }} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">{t('dashboard.chartTitle')}</h2>
                <p className="text-xs text-gray-400">{t('dashboard.chartSub')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--t-faint)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--chart-bar-warn)' }} />
                {t('dashboard.chartTooltipLabel')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 rounded-full inline-block" style={{ background: 'var(--green)' }} />
                Match rate
              </span>
            </div>
          </div>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--t-faint)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--t-faint)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={[80, 100]} tick={{ fontSize: 10, fill: 'var(--t-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={32} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(127,127,127,0.07)' }} />
                <Bar yAxisId="left" dataKey="discrepancies" radius={[5, 5, 0, 0]} maxBarSize={40}>
                  {trendData.map((entry, i) => (
                    <Cell key={i} fill={entry.discrepancies > 0 ? 'var(--chart-bar-warn)' : 'var(--chart-bar)'} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="matchRate"
                  stroke="var(--green)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--green)', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 4, fill: 'var(--green-strong)', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent open alerts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--tint-red)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)' }}>
                <Bell size={14} style={{ color: 'var(--red)' }} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">{t('dashboard.openAlertsTitle')}</h2>
                {alerts.length > 0 && (
                  <p className="text-xs text-gray-400">{t('dashboard.recentCount', { count: alerts.length })}</p>
                )}
              </div>
            </div>
            <Link to="/alerts" className="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-600 font-medium">
              {t('dashboard.viewAll')} <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="flex-1 space-y-3">
              {[0,1,2].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 size={22} className="text-green-500" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.noAlerts')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.allMatch')}</p>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-auto">
              {alerts.map(a => (
                <div
                  key={a._id}
                  style={{ background: a.severity === 'critical' ? 'var(--tint-red)' : 'var(--tint-amber)' }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--t-strong)' }} className="font-semibold w-10 shrink-0">{a.symbol}</span>
                    <AlertBadge type={a.severity} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: 'var(--red-strong)' }} className="font-medium">{a.differencePercent?.toFixed(2)}%</span>
                    <span style={{ color: 'var(--t-faint)' }}>{a.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Analytics row: source breakdown + top symbols */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <SourceBreakdown data={analyticsData} loading={loading} />
        </div>
        <div className="lg:col-span-3">
          <TopSymbols data={analyticsData} loading={loading} />
        </div>
      </div>

    </div>
  )
}
