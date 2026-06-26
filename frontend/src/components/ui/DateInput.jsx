import { useRef } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

/**
 * Styled date input — shows formatted DD/MM/YYYY, opens native calendar on click.
 * Usage:
 *   <DateInput value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
 */
export function DateInput({ value, onChange, className }) {
  const inputRef = useRef(null)

  const formattedDate = value ? dayjs(value).format('DD/MM/YYYY') : 'Chọn ngày'
  const hasValue = !!value

  const handleClick = () => {
    try {
      inputRef.current?.showPicker()
    } catch {
      // Fallback cho trình duyệt không support showPicker()
      inputRef.current?.focus()
      inputRef.current?.click()
    }
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg border transition-all duration-150',
          'focus:outline-none',
          'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-sm',
          hasValue ? 'text-gray-800' : 'text-gray-400'
        )}
      >
        <Calendar
          size={14}
          strokeWidth={2}
          className={cn('shrink-0', hasValue ? 'text-blue-500' : 'text-gray-400')}
        />
        <span className="tabular-nums">{formattedDate}</span>
        <ChevronDown size={14} strokeWidth={2} className="text-gray-400 shrink-0 ml-auto" />
      </button>

      {/* Hidden native input — handles the actual date picker */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  )
}
