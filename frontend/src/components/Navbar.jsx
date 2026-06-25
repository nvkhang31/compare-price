import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import api from '../services/api'

const links = [
  { to: '/dashboard',   label: 'Dashboard' },
  { to: '/comparisons', label: 'So sánh giá' },
  { to: '/alerts',      label: 'Cảnh báo' },
  { to: '/audit-log',   label: 'Audit Log' }
]

export default function Navbar() {
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg]         = useState('')

  const handleSync = async () => {
    setSyncing(true)
    setMsg('')
    try {
      const res = await api.prices.sync()
      const kis = res.summary?.kis
      setMsg(`Sync OK — KIS: ${kis?.total ?? 0} mã`)
    } catch (e) {
      setMsg(`Lỗi: ${e.message}`)
    } finally {
      setSyncing(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <span className="font-semibold text-gray-800 text-sm">KIS Price Tool</span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Sync button */}
          <div className="flex items-center gap-3">
            {msg && (
              <span className={`text-xs ${msg.startsWith('Lỗi') ? 'text-red-500' : 'text-green-600'}`}>
                {msg}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded transition-colors"
            >
              {syncing ? 'Đang sync...' : 'Sync ngay'}
            </button>
          </div>

        </div>
      </div>
    </nav>
  )
}
