import { cn } from '@/lib/utils'

const colorConfig = {
  blue:   { value: 'text-blue-600',  iconBg: 'bg-blue-50',  iconColor: 'text-blue-500'  },
  green:  { value: 'text-green-600', iconBg: 'bg-green-50', iconColor: 'text-green-500' },
  red:    { value: 'text-red-600',   iconBg: 'bg-red-50',   iconColor: 'text-red-500'   },
  yellow: { value: 'text-amber-600', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  gray:   { value: 'text-gray-500',  iconBg: 'bg-gray-100', iconColor: 'text-gray-400'  }
}

export default function StatsCard({ title, value, sub, color = 'blue', icon: Icon, gauge, delta }) {
  const c = colorConfig[color] ?? colorConfig.blue

  const gaugeColor = gauge == null ? '' :
    gauge >= 95 ? 'bg-green-500' :
    gauge >= 90 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500 leading-snug">{title}</p>
        {Icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', c.iconBg)}>
            <Icon size={17} className={c.iconColor} strokeWidth={2} />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 mt-3">
        <p className={cn('text-3xl font-bold tabular-nums', c.value)}>
          {value ?? '—'}
        </p>
        {delta != null && delta !== 0 && (
          <span className={cn(
            'mb-1 text-xs font-semibold px-1.5 py-0.5 rounded',
            delta > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
          )}>
            {delta > 0 ? `▲ +${delta}` : `▼ ${Math.abs(delta)}`}
          </span>
        )}
      </div>

      {sub && (
        <p className="text-xs text-gray-400 mt-1.5 leading-snug">{sub}</p>
      )}

      {gauge != null && (
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bd)' }}>
          <div
            className={cn('h-full rounded-full transition-all duration-700', gaugeColor)}
            style={{ width: `${Math.min(gauge, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
