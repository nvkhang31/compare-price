import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Comparisons from './pages/Comparisons'
import SymbolDetail from './pages/SymbolDetail'
import Alerts from './pages/Alerts'
import AuditLog from './pages/AuditLog'
import Game from './pages/Game'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: 'var(--pg)', transition: 'background-color 0.2s ease' }}>
        <Navbar />
        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/comparisons" element={<Comparisons />} />
            <Route path="/symbols/:symbol" element={<SymbolDetail />} />
            <Route path="/alerts"      element={<Alerts />} />
            <Route path="/audit-log"   element={<AuditLog />} />
            <Route path="/game"        element={<Game />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
