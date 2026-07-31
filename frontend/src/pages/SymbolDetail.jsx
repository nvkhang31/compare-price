import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../services/api'

const SOURCE_LABELS = { vps: 'VPS', vndirect: 'VNDirect', tcbs: 'TCBS', ssi: 'SSI' }

export default function SymbolDetail() {
  const { symbol } = useParams()
  const navigate   = useNavigate()
  const { t }      = useTranslation()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.comparisons.bySymbol(symbol)
        setData(res.data ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [symbol])

  const chartData = [...data].reverse().map(d => ({
    date:        dayjs(d.date).format('DD/MM'),
    discrepancy: d.hasDiscrepancy ? 1 : 0,
    fill:        d.hasDiscrepancy ? 'var(--red)' : 'var(--green)'
  }))

  const totalDiscrepant = data.filter(d => d.hasDiscrepancy).length
  const allSources      = [...new Set(data.flatMap(d => d.discrepantSources ?? []))]
  const lastDiscrepant  = data.find(d => d.hasDiscrepancy)
  const exchange        = data[0]?.exchange
  const discrepantRows  = data.filter(d => d.hasDiscrepancy).slice(0, 10)

  return (
    <div className="space-y-6 animate-slide-in-right max-w-5xl">

      {/* Back nav */}
      <button
        onClick={() => navigate('/comparisons')}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: 'var(--t-mid)' }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
        onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}
      >
        <ArrowLeft size={15} strokeWidth={2} />
        {t('symbol.back')}
      </button>

      {/* Symbol header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--t-strong)' }}>{symbol}</h1>
        {exchange && (
          <span className="text-xs font-bold px-2 py-0.5 rounded tracking-wide"
            style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
            {exchange}
          </span>
        )}
        {!loading && (
          totalDiscrepant === 0 ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--tint-green)', color: 'var(--green-strong)' }}>
              ✓ {t('symbol.allClean')}
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--tint-red)', color: 'var(--red-strong)' }}>
              {totalDiscrepant} {t('symbol.discrepancyCount')}
            </span>
          )
        )}
      </div>

      {/* Stats row */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs" style={{ color: 'var(--t-faint)' }}>{t('symbol.statDiscrepancies')}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums"
              style={{ color: totalDiscrepant > 0 ? 'var(--red-strong)' : 'var(--green-strong)' }}>
              {totalDiscrepant}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t-faint)' }}>
              {t('symbol.statOf', { days: data.length })}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs" style={{ color: 'var(--t-faint)' }}>{t('symbol.statSources')}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--t-strong)' }}>
              {allSources.length}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t-faint)' }}>
              {allSources.length > 0 ? allSources.map(s => SOURCE_LABELS[s] ?? s.toUpperCase()).join(', ') : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs" style={{ color: 'var(--t-faint)' }}>{t('symbol.statLast')}</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'var(--t-strong)' }}>
              {lastDiscrepant ? dayjs(lastDiscrepant.date).format('DD/MM/YYYY') : '—'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t-faint)' }}>
              {lastDiscrepant
                ? t('symbol.statDaysAgo', { n: dayjs().diff(dayjs(lastDiscrepant.date), 'day') })
                : t('symbol.noDiscrepancy')}
            </p>
          </div>
        </div>
      )}

      {/* 30-day trend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--t-strong)' }}>{t('symbol.chartTitle')}</h2>
        {loading ? (
          <div className="h-28 bg-gray-50 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={112}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--t-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={false} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(127,127,127,0.07)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const hasDisc = payload[0]?.value === 1
                  return (
                    <div className="px-2.5 py-1.5 rounded-md text-xs shadow-lg"
                      style={{ background: 'rgba(15,20,30,0.92)', color: '#e2e8f0' }}>
                      <span className="font-medium">{label}</span>
                      <span className="ml-2" style={{ color: hasDisc ? 'var(--red)' : 'var(--green)' }}>
                        {hasDisc ? t('symbol.tooltipDisc') : t('symbol.tooltipMatch')}
                      </span>
                    </div>
                  )
                }}
              />
              <Bar dataKey="discrepancy" radius={[3, 3, 0, 0]} maxBarSize={20}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Discrepant days detail */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--t-strong)' }}>{t('symbol.tableTitle')}</h2>
        {loading ? (
          <div className="space-y-2">
            {[0,1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : discrepantRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 bg-green-50 ring-4 ring-green-100 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={22} className="text-green-500" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-gray-600">{t('symbol.noDiscrepancy')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('symbol.noDiscrepancySub')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  {[t('symbol.colDate'), t('symbol.colSources'), t('symbol.colCeiling'), t('symbol.colFloor'), t('symbol.colRef')].map((h, i) => (
                    <th key={i} className={`pb-2.5 ${i >= 2 ? 'text-right' : 'text-left'} pr-4`}
                      style={{ color: 'var(--t-faint)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {discrepantRows.map(record => {
                  const discComps = record.comparisons?.filter(c => c.hasDiscrepancy) ?? []
                  return (
                    <tr key={record._id} className="audit-row" style={{ borderBottom: '1px solid var(--bd)' }}>
                      <td className="py-2.5 pr-4">
                        <span className="font-medium" style={{ color: 'var(--t-strong)' }}>
                          {dayjs(record.date).format('DD/MM/YYYY')}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {record.discrepantSources?.map(s => (
                            <span key={s} className="text-xs px-1.5 py-0.5 rounded font-medium"
                              style={{ background: 'var(--tint-red)', color: 'var(--red-strong)' }}>
                              {SOURCE_LABELS[s] ?? s.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                      {['ceiling', 'floor', 'reference'].map(field => {
                        const diffs = discComps.map(c => c[field]?.diffPct).filter(v => v != null && v !== 0)
                        const worst = diffs.length ? diffs.reduce((a, b) => Math.abs(a) > Math.abs(b) ? a : b) : null
                        return (
                          <td key={field} className="py-2.5 pr-4 text-right">
                            {worst != null ? (
                              <span className="font-semibold tabular-nums"
                                style={{ color: 'var(--red-strong)' }}>
                                {worst > 0 ? '+' : ''}{worst.toFixed(2)}%
                              </span>
                            ) : (
                              <span style={{ color: 'var(--t-ghost)' }}>—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
