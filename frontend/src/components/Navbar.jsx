import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  ScrollText,
  RefreshCw,
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react'
import api from '../services/api'

function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => document.body.classList.contains('dark')
  )

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.body.classList.toggle('dark', next)
    localStorage.setItem('app-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-lg nav-ctrl-btn"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
    </button>
  )
}

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
      className="flex items-center gap-0.5 rounded-lg overflow-hidden nav-ctrl-btn"
      title={isVI ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      <span className={isVI
        ? 'px-2 py-1.5 text-xs font-semibold tracking-wide bg-blue-600 text-white'
        : 'px-2 py-1.5 text-xs font-semibold tracking-wide nav-lang-seg'
      }>
        VIE
      </span>
      <span className={!isVI
        ? 'px-2 py-1.5 text-xs font-semibold tracking-wide bg-blue-600 text-white'
        : 'px-2 py-1.5 text-xs font-semibold tracking-wide nav-lang-seg'
      }>
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
    <nav className="nav-bar sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p style={{ color: 'var(--nav-logo-t)' }} className="font-semibold text-sm tracking-wide">KIS Price Tool</p>
              <p style={{ color: 'var(--nav-logo-sub)' }} className="text-[10px]">Price Comparison</p>
            </div>
          </div>

          {/* Nav links — pill container */}
          <div className="nav-pill-wrap">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
              >
                <Icon size={14} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          {/* Right side: theme toggle + lang toggle + sync */}
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <LangToggle />

            {msg && (
              <span
                className="text-xs font-medium px-2 py-1 rounded"
                style={{
                  color:      msgType === 'error' ? 'var(--red-strong)'  : 'var(--green-strong)',
                  background: msgType === 'error' ? 'var(--tint-red)'    : 'var(--tint-green)'
                }}
              >
                {msg}
              </span>
            )}

            <button
              onClick={handleSync}
              disabled={syncing}
              className="sync-btn flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium"
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
