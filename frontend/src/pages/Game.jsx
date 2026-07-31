import { useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import BullBear from '../components/BullBear'
import Snake from '../components/Snake'

const GAMES = [
  {
    id:       'bullbear',
    emoji:    '📈',
    name:     'Bull or Bear',
    desc:     'Đoán giá TC hôm nay tăng hay giảm so với hôm qua',
    lsKey:    'bullbear_highscore',
  },
  {
    id:       'snake',
    emoji:    '🐍',
    name:     'Snake',
    desc:     'Điều khiển rắn săn mồi — tốc độ tăng dần theo điểm',
    lsKey:    'snake_highscore',
  },
]

export default function Game() {
  const [selected, setSelected] = useState(null)

  if (selected === 'bullbear') return <BullBear onBack={() => setSelected(null)} />
  if (selected === 'snake')    return <Snake    onBack={() => setSelected(null)} />

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">

      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ background: 'var(--tint-blue)' }}>
          <Gamepad2 size={28} style={{ color: 'var(--blue)' }} strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--t-strong)' }}>Chọn game</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-mid)' }}>
          Giải trí trong lúc chờ sync
        </p>
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {GAMES.map(g => {
          const best = parseInt(localStorage.getItem(g.lsKey) ?? '0')
          return (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--bd)',
              }}
            >
              <span className="text-3xl">{g.emoji}</span>
              <div className="text-center">
                <p className="font-bold text-sm" style={{ color: 'var(--t-strong)' }}>{g.name}</p>
                <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--t-faint)' }}>{g.desc}</p>
              </div>
              {best > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
                  🏆 {best}
                </span>
              )}
            </button>
          )
        })}
      </div>

    </div>
  )
}
