import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

const WEEKDAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function buildCalendarCells(viewDate) {
  const startOfMonth = viewDate.startOf('month')
  const firstDayOfWeek = startOfMonth.day() // 0=Sun
  const daysInMonth = viewDate.daysInMonth()
  const cells = []

  for (let i = firstDayOfWeek - 1; i >= 0; i--)
    cells.push({ date: startOfMonth.subtract(i + 1, 'day'), outside: true })

  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: viewDate.date(d), outside: false })

  while (cells.length < 42)
    cells.push({ date: cells[cells.length - 1].date.add(1, 'day'), outside: true })

  return cells
}

export function DateInput({ value, onChange, className }) {
  const { t, i18n } = useTranslation()
  const isVI = i18n.language === 'vi'

  const [open,     setOpen]     = useState(false)
  const [viewDate, setViewDate] = useState(() => dayjs(value || undefined))

  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  const selected = value ? dayjs(value) : null
  const today    = dayjs()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!triggerRef.current?.contains(e.target) && !popoverRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Sync view when value changes externally
  useEffect(() => {
    if (value) setViewDate(dayjs(value))
  }, [value])

  const handleSelect = (date) => {
    onChange({ target: { value: date.format('YYYY-MM-DD') } })
    setOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange({ target: { value: '' } })
  }

  const monthLabel = isVI
    ? `Tháng ${viewDate.month() + 1} · ${viewDate.year()}`
    : viewDate.format('MMMM YYYY')

  const weekdays = isVI ? WEEKDAYS_VI : WEEKDAYS_EN
  const cells    = buildCalendarCells(viewDate)

  return (
    <div className={cn('relative inline-block', className)}>

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg border transition-all duration-150 focus:outline-none',
          open
            ? 'bg-white border-blue-400 ring-2 ring-blue-100 shadow-sm'
            : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-sm',
          selected ? 'text-gray-800' : 'text-gray-400'
        )}
      >
        <Calendar
          size={14}
          strokeWidth={2}
          className={cn('shrink-0 transition-colors', selected ? 'text-blue-500' : 'text-gray-400')}
        />
        <span className="tabular-nums flex-1 text-left">
          {selected ? selected.format('DD/MM/YYYY') : t('common.selectDate')}
        </span>
        {selected ? (
          <span
            role="button"
            onClick={handleClear}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
          >
            <X size={11} className="text-gray-400" strokeWidth={2.5} />
          </span>
        ) : (
          <ChevronDown
            size={13}
            strokeWidth={2}
            className={cn('text-gray-400 shrink-0 transition-transform duration-150', open && 'rotate-180')}
          />
        )}
      </button>

      {/* Calendar popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1.5 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64 select-none"
        >

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewDate(d => d.subtract(1, 'month'))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
            <span className="text-sm font-semibold text-gray-800 tracking-tight">
              {monthLabel}
            </span>
            <button
              onClick={() => setViewDate(d => d.add(1, 'month'))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekdays.map(d => (
              <div
                key={d}
                className="h-7 flex items-center justify-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map(({ date, outside }, i) => {
              const isSelected = selected && date.isSame(selected, 'day')
              const isToday    = date.isSame(today, 'day')
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(date)}
                  className={cn(
                    'h-8 w-full flex items-center justify-center text-xs rounded-lg transition-colors duration-100',
                    outside && !isSelected && 'text-gray-300 hover:bg-gray-50',
                    !outside && !isSelected && !isToday && 'text-gray-700 hover:bg-blue-50 hover:text-blue-600',
                    isToday && !isSelected && 'text-blue-600 font-bold hover:bg-blue-50 ring-1 ring-blue-200 ring-inset',
                    isSelected && 'bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700'
                  )}
                >
                  {date.date()}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => { setViewDate(today); handleSelect(today) }}
              className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
            >
              {t('common.today')}
            </button>
            {selected && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t('common.clearDate')}
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
