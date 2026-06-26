import { cn } from '@/lib/utils'

const colorConfig = {
  blue:   { value: 'text-blue-600',  iconBg: 'bg-blue-50',  iconColor: 'text-blue-500'  },
  green:  { value: 'text-green-600', iconBg: 'bg-green-50', iconColor: 'text-green-500' },
  red:    { value: 'text-red-600',   iconBg: 'bg-red-50',   iconColor: 'text-red-500'   },
  yellow: { value: 'text-amber-600', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  gray:   { value: 'text-gray-500',  iconBg: 'bg-gray-100', iconColor: 'text-gray-400'  }
}

export default function StatsCard({ title, value, sub, color = 'blue', icon: Icon }) {
  const c = colorConfig[color] ?? colorConfig.blue

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
      <p className={cn('text-3xl font-bold mt-3 tabular-nums', c.value)}>
        {value ?? '—'}
      </p>
      {sub && (
        <p className="text-xs text-gray-400 mt-1.5 leading-snug">{sub}</p>
      )}
    </div>
  )
}
