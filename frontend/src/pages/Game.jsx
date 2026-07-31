import { useState } from 'react'
import { Gamepad2, CandlestickChart, Joystick, Grid3x3 } from 'lucide-react'
import BullBear from '../components/BullBear'
import Snake from '../components/Snake'
import Sudoku from '../components/Sudoku'

const GAMES = [
  {
    id:       'bullbear',
    icon:     CandlestickChart,
    name:     'Bull or Bear',
    desc:     'Đoán giá TC hôm nay tăng hay giảm so với hôm qua',
    tag:      'REAL DATA',
    lsKey:    'bullbear_highscore',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(16,185,129,0.04) 100%)',
    border:   'rgba(34,197,94,0.32)',
    accent:   '#22c55e',
    iconBg:   'rgba(34,197,94,0.16)',
    tagBg:    'rgba(34,197,94,0.14)',
    tagColor: '#16a34a',
  },
  {
    id:       'snake',
    icon:     Joystick,
    name:     'Snake',
    desc:     'Điều khiển rắn săn mồi — tốc độ tăng dần theo điểm',
    tag:      'ARCADE',
    lsKey:    'snake_highscore',
    gradient: 'linear-gradient(135deg, rgba(20,184,166,0.14) 0%, rgba(6,182,212,0.04) 100%)',
    border:   'rgba(20,184,166,0.32)',
    accent:   '#14b8a6',
    iconBg:   'rgba(20,184,166,0.16)',
    tagBg:    'rgba(20,184,166,0.14)',
    tagColor: '#0d9488',
  },
  {
    id:       'sudoku',
    icon:     Grid3x3,
    name:     'Sudoku',
    desc:     'Điền số 1–9 vào mỗi hàng, cột và ô 3×3',
    tag:      'PUZZLE',
    lsKey:    null,
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(168,85,247,0.04) 100%)',
    border:   'rgba(99,102,241,0.32)',
    accent:   '#6366f1',
    iconBg:   'rgba(99,102,241,0.16)',
    tagBg:    'rgba(99,102,241,0.14)',
    tagColor: '#4f46e5',
  },
]

export default function Game() {
  const [selected, setSelected] = useState(null)

  if (selected === 'bullbear') return <BullBear onBack={() => setSelected(null)} />
  if (selected === 'snake')    return <Snake    onBack={() => setSelected(null)} />
  if (selected === 'sudoku')   return <Sudoku   onBack={() => setSelected(null)} />

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">

      {/* ── Arcade header ── */}
      <div className="flex flex-col items-center gap-3">

        {/* Glowing icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #38bdf8 100%)',
              boxShadow: '0 0 28px rgba(129,140,248,0.45), 0 0 56px rgba(192,132,252,0.2)',
            }}>
            <Gamepad2 size={30} className="text-white" strokeWidth={1.8} />
          </div>
          {/* Subtle pulse ring */}
          <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
            style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', animationDuration: '2.4s' }} />
        </div>

        {/* Gradient title */}
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-widest uppercase"
            style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 45%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 12px rgba(129,140,248,0.4))',
            }}>
            Game Center
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: 'var(--t-faint)' }}>
            Giải trí trong lúc chờ sync
          </p>
        </div>

      </div>

      {/* ── Game cards ── */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {GAMES.map(g => {
          const best = g.lsKey ? parseInt(localStorage.getItem(g.lsKey) ?? '0') : 0
          return (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] text-left"
              style={{
                background: g.gradient,
                border: `1px solid ${g.border}`,
              }}
            >
              {/* Icon in tinted circle */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: g.iconBg }}>
                <g.icon size={24} strokeWidth={1.8} style={{ color: g.accent }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-sm" style={{ color: 'var(--t-strong)' }}>{g.name}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider shrink-0"
                    style={{ background: g.tagBg, color: g.tagColor }}>
                    {g.tag}
                  </span>
                </div>
                <p className="text-xs leading-snug" style={{ color: 'var(--t-faint)' }}>{g.desc}</p>
              </div>

              {/* High score */}
              {best > 0 && (
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[10px] font-semibold" style={{ color: g.accent }}>BEST</span>
                  <span className="text-lg font-black tabular-nums leading-tight" style={{ color: g.accent }}>
                    {best}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

    </div>
  )
}
