import { useState, useRef, useEffect, Children, cloneElement } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Usage:
 *   <Select value={val} onChange={v => setVal(v)} placeholder="Tất cả">
 *     <SelectOption value="">Tất cả</SelectOption>
 *     <SelectOption value="open">Đang mở</SelectOption>
 *   </Select>
 */

export function SelectOption({ value, children, _selected, _onSelect }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); _onSelect?.(value) }}
      className={cn(
        'w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left transition-colors duration-100',
        _selected
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-50'
      )}
    >
      <span>{children}</span>
      {_selected && <Check size={13} strokeWidth={2.5} className="text-blue-500 shrink-0" />}
    </button>
  )
}

export function Select({ value, onChange, placeholder = 'Chọn...', children, className }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)

  // Find label for the currently selected value
  const options       = Children.toArray(children)
  const selectedChild = options.find(opt => opt.props.value === value)
  const label         = selectedChild ? selectedChild.props.children : placeholder
  const hasValue      = value !== '' && value != null

  // Close on outside click
  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on ESC
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') setOpen(false) }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between gap-2 w-full px-3 py-1.5 text-sm rounded-lg border transition-all duration-150',
          'focus:outline-none',
          open
            ? 'bg-white border-blue-400 ring-2 ring-blue-100 shadow-sm'
            : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-sm',
          hasValue ? 'text-gray-800' : 'text-gray-400'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn(
            'shrink-0 transition-transform duration-200',
            open ? 'text-blue-500 rotate-180' : 'text-gray-400'
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl border border-gray-100',
          'shadow-lg shadow-gray-200/60 overflow-hidden py-1 min-w-full w-max'
        )}>
          {Children.map(children, child =>
            cloneElement(child, {
              _selected: child.props.value === value,
              _onSelect: v => { onChange(v); setOpen(false) }
            })
          )}
        </div>
      )}
    </div>
  )
}
