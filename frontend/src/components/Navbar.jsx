import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  ScrollText,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '../services/api'

const links = [
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/comparisons', label: 'So sánh giá',  icon: BarChart3       },
  { to: '/alerts',      label: 'Cảnh báo',     icon: Bell            },
  { to: '/audit-log',   label: 'Audit Log',    icon: ScrollText      }
]

export default function Navbar() {
  const [syncing, setSyncing] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [msgType, setMsgType] = useState('success') // 'success' | 'error'

  const handleSync = async () => {
    setSyncing(true)
    setMsg('')
    try {
      await api.prices.sync()
      setMsgType('success')
      setMsg('Sync đã kích hoạt')
    } catch (e) {
      setMsgType('error')
      setMsg('Sync thất bại')
    } finally {
      setSyncing(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
              <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="text-white font-semibold text-sm tracking-wide">KIS Price Tool</p>
              <p className="text-slate-400 text-[10px]">Price Comparison</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 font-medium'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  )
                }
              >
                <Icon size={15} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          {/* Sync button + message */}
          <div className="flex items-center gap-3 shrink-0">
            {msg && (
              <span className={cn(
                'text-xs font-medium px-2 py-1 rounded',
                msgType === 'error'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-green-500/15 text-green-400'
              )}>
                {msg}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-150',
                'bg-blue-600 hover:bg-blue-500 text-white shadow-sm',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw
                size={14}
                strokeWidth={2}
                className={syncing ? 'animate-spin' : ''}
              />
              <span>{syncing ? 'Đang sync...' : 'Sync ngay'}</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  )
}
