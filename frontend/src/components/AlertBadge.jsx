const styles = {
  critical:     'bg-red-100 text-red-700 border border-red-200',
  warning:      'bg-yellow-100 text-yellow-700 border border-yellow-200',
  info:         'bg-blue-100 text-blue-700 border border-blue-200',
  open:         'bg-red-50 text-red-600',
  acknowledged: 'bg-yellow-50 text-yellow-700',
  resolved:     'bg-green-50 text-green-700'
}

const labels = {
  critical: 'Critical', warning: 'Warning', info: 'Info',
  open: 'Mở', acknowledged: 'Đã ghi nhận', resolved: 'Đã xử lý'
}

export default function AlertBadge({ type }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[type] ?? type}
    </span>
  )
}
