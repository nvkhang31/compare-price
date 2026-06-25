import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import dayjs from 'dayjs'
import api from '../services/api'
import StatsCard from '../components/StatsCard'
import AlertBadge from '../components/AlertBadge'

export default function Dashboard() {
  const [stats,      setStats]      = useState(null)
  const [alerts,     setAlerts]     = useState([])
  const [trendData,  setTrendData]  = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, alertRes] = await Promise.all([
          api.stats(),
          api.alerts.list({ status: 'open', limit: 5 })
        ])
        setStats(statsRes.data)
        setAlerts(alertRes.data)

        // Trend 7 ngày
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

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>

  const s = stats ?? {}

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <div className="text-right">
          {s.lastSyncAt ? (
            <span className="text-xs text-gray-400">
              Sync cuối: {dayjs(s.lastSyncAt).format('DD/MM/YYYY HH:mm')}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Chưa có lần sync nào</span>
          )}
          {s.sourcesAvailable?.length > 0 && (
            <div className="flex gap-1 mt-1 justify-end">
              {s.sourcesAvailable.map(src => (
                <span key={src} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                  {src.toUpperCase()} ✓
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          title="Mã đang theo dõi"
          value={s.symbolsTracked ?? 0}
          color="blue"
          sub={`${s.sourcesAvailable?.length ?? 0} nguồn dữ liệu`}
        />
        <StatsCard
          title="Sai lệch hôm nay"
          value={s.discrepanciesToday ?? 0}
          color={s.discrepanciesToday > 0 ? 'red' : 'green'}
          sub={s.matchRate != null ? `Match rate ${s.matchRate}%` : 'Chờ so sánh'}
        />
        <StatsCard
          title="Cảnh báo đang mở"
          value={s.openAlerts ?? 0}
          color={s.openAlerts > 0 ? 'yellow' : 'green'}
          sub="Chưa xử lý"
        />
        <StatsCard
          title="Critical"
          value={s.criticalAlerts ?? 0}
          color={s.criticalAlerts > 0 ? 'red' : 'gray'}
          sub="Chênh lệch > 5%"
        />
      </div>

      {/* Nguồn chưa hoạt động */}
      {s.sourcesAvailable && s.sourcesAvailable.length < 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700">
          <strong>Lưu ý:</strong> Hiện chỉ có{' '}
          <strong>{s.sourcesAvailable.map(x => x.toUpperCase()).join(', ')}</strong> đang hoạt động.
          So sánh sẽ được kích hoạt sau khi deploy backend lên cloud và VNDirect/TCBS accessible.
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">
          Xu hướng sai lệch — 7 ngày gần nhất
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [v, 'Sai lệch']} />
            <Bar dataKey="discrepancies" radius={[4, 4, 0, 0]}>
              {trendData.map((entry, i) => (
                <Cell key={i} fill={entry.discrepancies > 0 ? '#EF4444' : '#93C5FD'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent alerts */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Cảnh báo đang mở</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Không có cảnh báo nào đang mở
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">Mã</th>
                <th className="pb-2 font-medium">Loại</th>
                <th className="pb-2 font-medium">Mức độ</th>
                <th className="pb-2 font-medium">Chênh lệch</th>
                <th className="pb-2 font-medium">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-medium">{a.symbol}</td>
                  <td className="py-2 text-gray-500 capitalize">
                    {a.discrepancyType?.replace('Price', '')}
                  </td>
                  <td className="py-2"><AlertBadge type={a.severity} /></td>
                  <td className="py-2 text-red-600">{a.differencePercent?.toFixed(2)}%</td>
                  <td className="py-2 text-gray-400">{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
