import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

function LangToggle() {
  const { i18n } = useTranslation()
  const isVI = i18n.language === 'vi'

  const toggle = () => {
    const next = isVI ? 'en' : 'vi'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center gap-0.5 rounded-lg border text-xs font-semibold tracking-wide',
        'overflow-hidden transition-colors duration-150',
        'border-slate-700 bg-slate-800'
      )}
      title={isVI ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      <span className={cn(
        'px-2 py-1.5 transition-colors duration-150',
        isVI ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
      )}>
        VIE
      </span>
      <span className={cn(
        'px-2 py-1.5 transition-colors duration-150',
        !isVI ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
      )}>
        ENG
      </span>
    </button>
  )
}

export default function Navbar() {
  const { t } = useTranslation()
  const [syncing, setSyncing] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [msgType, setMsgType] = useState('success')

  const links = [
    { to: '/dashboard',   label: t('nav.dashboard'),   icon: LayoutDashboard },
    { to: '/comparisons', label: t('nav.comparisons'), icon: BarChart3       },
    { to: '/alerts',      label: t('nav.alerts'),      icon: Bell            },
    { to: '/audit-log',   label: t('nav.auditLog'),    icon: ScrollText      }
  ]

  const handleSync = async () => {
    setSyncing(true)
    setMsg('')
    try {
      await api.prices.sync()
      setMsgType('success')
      setMsg(t('nav.syncOk'))
    } catch (e) {
      setMsgType('error')
      setMsg(t('nav.syncFail'))
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

          {/* Right side: lang toggle + sync */}
          <div className="flex items-center gap-3 shrink-0">
            <LangToggle />

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
              <RefreshCw size={14} strokeWidth={2} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? t('nav.syncing') : t('nav.syncNow')}</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  )
}
