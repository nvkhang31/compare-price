import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  Database,
  ArrowLeftRight,
  Bell,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import api from '../services/api'
import StatsCard from '../components/StatsCard'
import AlertBadge from '../components/AlertBadge'
import { cn } from '@/lib/utils'

dayjs.locale('vi')

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className="font-semibold text-gray-800">
        {payload[0].value}{' '}
        <span className="font-normal text-gray-500">sai lệch</span>
      </p>
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

export default function Dashboard() {
  const [stats,     setStats]     = useState(null)
  const [alerts,    setAlerts]    = useState([])
  const [trendData, setTrendData] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, alertRes] = await Promise.all([
          api.stats(),
          api.alerts.list({ status: 'open', limit: 5 })
        ])
        setStats(statsRes.data)
        setAlerts(alertRes.data)

        const trend = []
        for (let i = 6; i >= 0; i--) {
          const d   = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
          const res = await api.comparisons.summary({ date: d })
          trend.push({
            date:          dayjs(d).format('DD/MM'),
            discrepancies: res.data?.withDiscrepancy ?? 0
          })
        }
        setTrendData(trend)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const s = stats ?? {}

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {dayjs().format('dddd, DD/MM/YYYY')}
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
              Sync cuối: {dayjs(s.lastSyncAt).format('HH:mm DD/MM')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              Chưa có lần sync nào
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
            title="Mã đang theo dõi"
            value={s.symbolsTracked ?? 0}
            color="blue"
            icon={Database}
            sub={`${s.sourcesAvailable?.length ?? 0} nguồn dữ liệu`}
          />
          <StatsCard
            title="Sai lệch hôm nay"
            value={s.discrepanciesToday ?? 0}
            color={s.discrepanciesToday > 0 ? 'red' : 'green'}
            icon={ArrowLeftRight}
            sub={s.matchRate != null ? `Match rate ${s.matchRate}%` : 'Chờ so sánh'}
          />
          <StatsCard
            title="Cảnh báo đang mở"
            value={s.openAlerts ?? 0}
            color={s.openAlerts > 0 ? 'yellow' : 'green'}
            icon={Bell}
            sub="Chưa xử lý"
          />
          <StatsCard
            title="Critical"
            value={s.criticalAlerts ?? 0}
            color={s.criticalAlerts > 0 ? 'red' : 'gray'}
            icon={ShieldAlert}
            sub="Chênh lệch > 5%"
          />
        </div>
      )}

      {/* Warning: limited sources */}
      {!loading && s.sourcesAvailable && s.sourcesAvailable.length < 3 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" strokeWidth={2} />
          <span>
            Đang hoạt động:{' '}
            <strong>{s.sourcesAvailable.map(x => x.toUpperCase()).join(', ')}</strong>.{' '}
            VNDirect và TCBS chưa khả dụng — so sánh sẽ đầy đủ hơn khi có thêm nguồn.
          </span>
        </div>
      )}

      {/* Chart + Alerts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Trend chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <Activity size={14} className="text-blue-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Xu hướng sai lệch</h2>
              <p className="text-xs text-gray-400">7 ngày gần nhất</p>
            </div>
          </div>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="discrepancies" radius={[5, 5, 0, 0]} maxBarSize={40}>
                  {trendData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.discrepancies > 0 ? '#f87171' : '#bfdbfe'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent open alerts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                <Bell size={14} className="text-red-500" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Cảnh báo đang mở</h2>
                {alerts.length > 0 && (
                  <p className="text-xs text-gray-400">{alerts.length} gần nhất</p>
                )}
              </div>
            </div>
            <Link
              to="/alerts"
              className="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="flex-1 space-y-3">
              {[0,1,2].map(i => (
                <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 size={22} className="text-green-500" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-gray-600">Không có cảnh báo</p>
              <p className="text-xs text-gray-400 mt-0.5">Tất cả giá đang khớp nhau</p>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-auto">
              {alerts.map(a => (
                <div
                  key={a._id}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm',
                    a.severity === 'critical' ? 'bg-red-50' : 'bg-amber-50/60'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 w-10 shrink-0">{a.symbol}</span>
                    <AlertBadge type={a.severity} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-600 font-medium">
                      {a.differencePercent?.toFixed(2)}%
                    </span>
                    <span className="text-gray-400">{a.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
