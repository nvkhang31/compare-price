import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Comparisons from './pages/Comparisons'
import SymbolDetail from './pages/SymbolDetail'
import Alerts from './pages/Alerts'
import AuditLog from './pages/AuditLog'
import Game from './pages/Game'

// Wrapper for every route that isn't the landing page
function PageShell({ children }) {
  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
      {children}
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: 'var(--pg)', transition: 'background-color 0.2s ease' }}>
        <Navbar />
        <Routes>
          {/* Landing page — full-width, no container */}
          <Route path="/"            element={<Home />} />

          {/* App pages — constrained container */}
          <Route path="/dashboard"   element={<PageShell><Dashboard /></PageShell>} />
          <Route path="/comparisons" element={<PageShell><Comparisons /></PageShell>} />
          <Route path="/symbols/:symbol" element={<PageShell><SymbolDetail /></PageShell>} />
          <Route path="/alerts"      element={<PageShell><Alerts /></PageShell>} />
          <Route path="/audit-log"   element={<PageShell><AuditLog /></PageShell>} />
          <Route path="/game"        element={<PageShell><Game /></PageShell>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
