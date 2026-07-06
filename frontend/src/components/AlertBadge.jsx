import { ShieldAlert, AlertTriangle, Info, Circle, CheckCircle2, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const config = {
  critical:     { icon: ShieldAlert,   bg: 'var(--tint-red)',    color: 'var(--red-strong)',   bd: 'color-mix(in srgb, var(--red) 30%, transparent)'   },
  warning:      { icon: AlertTriangle, bg: 'var(--tint-amber)',  color: 'var(--amber-strong)', bd: 'color-mix(in srgb, var(--amber) 30%, transparent)'  },
  info:         { icon: Info,          bg: 'var(--tint-blue)',   color: 'var(--blue)',         bd: 'color-mix(in srgb, var(--blue) 30%, transparent)'   },
  open:         { icon: Circle,        bg: 'var(--tint-red)',    color: 'var(--red-strong)',   bd: 'color-mix(in srgb, var(--red) 22%, transparent)'    },
  acknowledged: { icon: Clock,         bg: 'var(--tint-amber)',  color: 'var(--amber-strong)', bd: 'color-mix(in srgb, var(--amber) 22%, transparent)'  },
  resolved:     { icon: CheckCircle2,  bg: 'var(--tint-green)',  color: 'var(--green-strong)', bd: 'color-mix(in srgb, var(--green) 28%, transparent)'  }
}

const LABEL_KEYS = {
  critical:     'alerts.badgeCritical',
  warning:      'alerts.badgeWarning',
  info:         'alerts.badgeInfo',
  open:         'alerts.badgeOpen',
  acknowledged: 'alerts.badgeAcknowledged',
  resolved:     'alerts.badgeResolved'
}

export default function AlertBadge({ type }) {
  const { t } = useTranslation()
  const c = config[type]
  if (!c) return (
    <span
      style={{ background: 'var(--bd)', color: 'var(--t-mid)', border: '1px solid var(--bd2)' }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
    >
      {type}
    </span>
  )
  const Icon = c.icon
  return (
    <span
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.bd}` }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
    >
      <Icon size={10} strokeWidth={2.5} />
      {t(LABEL_KEYS[type])}
    </span>
  )
}
