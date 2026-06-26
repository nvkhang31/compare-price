import { ShieldAlert, AlertTriangle, Info, Circle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const config = {
  // Severity
  critical:     { icon: ShieldAlert,   bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    label: 'Critical'      },
  warning:      { icon: AlertTriangle, bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Warning'       },
  info:         { icon: Info,          bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Info'          },
  // Status
  open:         { icon: Circle,        bg: 'bg-red-50',     text: 'text-red-600',    border: 'border-red-200',    label: 'Đang mở'       },
  acknowledged: { icon: Clock,         bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  label: 'Đã ghi nhận'   },
  resolved:     { icon: CheckCircle2,  bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  label: 'Đã xử lý'     }
}

export default function AlertBadge({ type }) {
  const c = config[type]
  if (!c) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {type}
    </span>
  )
  const Icon = c.icon
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
      c.bg, c.text, c.border
    )}>
      <Icon size={10} strokeWidth={2.5} />
      {c.label}
    </span>
  )
}
