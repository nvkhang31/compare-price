import { useState } from 'react'
import { Gamepad2, Lightbulb } from 'lucide-react'
import BullBear from '../components/BullBear'
import Snake from '../components/Snake'
import Sudoku from '../components/Sudoku'
import Caro from '../components/Caro'

// ── Custom game icons ─────────────────────────────────────────

function BullIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      {/* Green bull candle — tall */}
      <line x1="6" y1="1.5" x2="6" y2="4.5"   stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="4.5" width="6" height="13" rx="1.5" fill="#22c55e" />
      <line x1="6" y1="17.5" x2="6" y2="20.5"  stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
      {/* Red bear candle — shorter */}
      <line x1="16" y1="2" x2="16" y2="7"      stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="7" width="6" height="9"   rx="1.5" fill="#f87171" />
      <line x1="16" y1="16" x2="16" y2="20.5"  stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SnakeIcon({ size = 22, style }) {
  const color = style?.color ?? '#14b8a6'
  return (
    <svg width={size} height={size} viewBox="0 0 24 22" fill="none">
      {/* Tail curving in from bottom-left */}
      <path d="M2,21 Q3,14 9,12" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      {/* Head */}
      <circle cx="15" cy="10" r="7.5" fill={color} />
      {/* Eye */}
      <circle cx="18" cy="7.5" r="2"   fill="white" />
      <circle cx="18.6" cy="8"  r="1"   fill="#0f172a" />
      {/* Forked tongue */}
      <line x1="21.5" y1="11" x2="24" y2="9.2"  stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="21.5" y1="11" x2="24" y2="13"   stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function CaroIcon({ size = 22, style }) {
  const ac = style?.color ?? '#a855f7'
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <line x1="7.5"  y1="2"  x2="7.5"  y2="20" stroke={ac} strokeWidth="1"   opacity="0.38"/>
      <line x1="14.5" y1="2"  x2="14.5" y2="20" stroke={ac} strokeWidth="1"   opacity="0.38"/>
      <line x1="2"    y1="7.5" x2="20"  y2="7.5" stroke={ac} strokeWidth="1"  opacity="0.38"/>
      <line x1="2"    y1="14.5" x2="20" y2="14.5" stroke={ac} strokeWidth="1" opacity="0.38"/>
      {/* X — top-left cell */}
      <line x1="3.2" y1="3.2" x2="6.3" y2="6.3" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6.3" y1="3.2" x2="3.2" y2="6.3" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      {/* O — center cell */}
      <circle cx="11" cy="11" r="2.4" stroke="#f87171" strokeWidth="2" fill="none"/>
      {/* X — bottom-right cell */}
      <line x1="15.7" y1="15.7" x2="18.8" y2="18.8" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18.8" y1="15.7" x2="15.7" y2="18.8" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ── Animated preview components ─────────────────────────────

function BullPreview() {
  const candles = [
    { cx: 11, wT: 4,  wB: 58, bT: 13, bH: 26, color: '#22c55e', cls: 'preview-candle-1' },
    { cx: 25, wT: 10, wB: 54, bT: 28, bH: 14, color: '#f87171', cls: 'preview-candle-2' },
    { cx: 39, wT: 6,  wB: 56, bT: 17, bH: 22, color: '#22c55e', cls: 'preview-candle-3' },
    { cx: 53, wT: 8,  wB: 58, bT: 24, bH: 18, color: '#f87171', cls: 'preview-candle-4' },
  ]
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      {candles.map(({ cx, wT, wB, bT, bH, color, cls }) => (
        <g key={cx} className={cls}>
          <line x1={cx} y1={wT} x2={cx} y2={wB} stroke={color} strokeWidth="1.5" opacity="0.35" />
          <rect x={cx - 5} y={bT} width="10" height={bH} rx="2" fill={color} />
        </g>
      ))}
    </svg>
  )
}

function SnakePreview() {
  return (
    <svg width="64" height="64" viewBox="0 0 60 60" fill="none">
      {/* Background grid dots */}
      {Array.from({ length: 5 }).flatMap((_, r) =>
        Array.from({ length: 5 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={c * 12 + 6} cy={r * 12 + 6} r="1" fill="#2dd4bf" opacity="0.12" />
        ))
      )}
      {/* Snake body — S-curve with crawl dash animation */}
      <path
        className="preview-snake-body"
        d="M6,54 Q6,42 18,42 Q30,42 30,30 Q30,18 42,18 Q54,18 54,6"
        stroke="#2dd4bf" strokeWidth="6" strokeLinecap="round" fill="none"
      />
      {/* Head */}
      <circle cx="54" cy="6" r="6.5" fill="#14b8a6" />
      <circle cx="56.8" cy="3.8" r="2" fill="white" />
      <circle cx="57.3" cy="4.3" r="1" fill="#0f172a" />
      {/* Food with ping ring */}
      <g transform="translate(44,44)">
        <circle r="4" fill="#f87171" className="preview-food-ring" />
        <circle r="4" fill="#f87171" />
      </g>
    </svg>
  )
}

function SudokuPreview() {
  return (
    <svg width="64" height="64" viewBox="0 0 60 60" fill="none">
      {/* Card background */}
      <rect x="1" y="1" width="58" height="58" rx="5" stroke="#818cf8" strokeWidth="1.2" fill="rgba(99,102,241,0.08)" />
      {/* Inner grid lines */}
      <line x1="20.5" y1="1"  x2="20.5" y2="59" stroke="#818cf8" strokeWidth="1"   opacity="0.4" />
      <line x1="39.5" y1="1"  x2="39.5" y2="59" stroke="#818cf8" strokeWidth="1"   opacity="0.4" />
      <line x1="1"  y1="20.5" x2="59"   y2="20.5" stroke="#818cf8" strokeWidth="1" opacity="0.4" />
      <line x1="1"  y1="39.5" x2="59"   y2="39.5" stroke="#818cf8" strokeWidth="1" opacity="0.4" />
      {/* Numbers — staggered fade in/out */}
      <text x="10.5" y="10.5" fontSize="13" fill="#a5b4fc" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num">5</text>
      <text x="29.5" y="10.5" fontSize="13" fill="#c7d2fe" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num game-sudoku-n2">3</text>
      <text x="29.5" y="29.5" fontSize="13" fill="#a5b4fc" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num game-sudoku-n3">8</text>
      <text x="10.5" y="48.5" fontSize="13" fill="#c7d2fe" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num game-sudoku-n4">7</text>
      <text x="48.5" y="48.5" fontSize="13" fill="#a5b4fc" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num game-sudoku-n5">1</text>
    </svg>
  )
}

function CaroPreview() {
  const stones = [
    { x: 3,  y: 3,  blue: true  },
    { x: 15, y: 3,  blue: false },
    { x: 9,  y: 9,  blue: true  },
    { x: 21, y: 9,  blue: false },
    { x: 15, y: 15, blue: true  },
    { x: 3,  y: 21, blue: false },
    { x: 21, y: 21, blue: true  },
  ]
  return (
    <svg width="64" height="64" viewBox="0 0 30 30" fill="none">
      <defs>
        <radialGradient id="cpx" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#93c5fd"/>
          <stop offset="100%" stopColor="#1d4ed8"/>
        </radialGradient>
        <radialGradient id="cpo" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fca5a5"/>
          <stop offset="100%" stopColor="#b91c1c"/>
        </radialGradient>
      </defs>
      {[6, 12, 18, 24].map(v => (
        <g key={v}>
          <line x1={v} y1="0" x2={v} y2="30" stroke="rgba(148,163,184,0.22)" strokeWidth="0.6"/>
          <line x1="0" y1={v} x2="30" y2={v} stroke="rgba(148,163,184,0.22)" strokeWidth="0.6"/>
        </g>
      ))}
      {stones.map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r="2.2"
          fill={s.blue ? 'url(#cpx)' : 'url(#cpo)'}
          className={`caro-preview-stone caro-preview-s${i + 1}`}
        />
      ))}
    </svg>
  )
}

// ── Game config ──────────────────────────────────────────────

const GAMES = [
  {
    id:        'bullbear',
    icon:      BullIcon,
    name:      'Bull or Bear',
    desc:      'Đoán giá TC hôm nay tăng hay giảm so với hôm qua',
    tag:       'REAL DATA',
    lsKey:     'bullbear_highscore',
    preview:   BullPreview,
    gradient:  'linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(16,185,129,0.04) 100%)',
    border:    'rgba(34,197,94,0.32)',
    accent:    '#22c55e',
    iconBg:    'rgba(34,197,94,0.16)',
    tagBg:     'rgba(34,197,94,0.14)',
    tagColor:  '#16a34a',
    playColor: '#4ade80',
  },
  {
    id:        'snake',
    icon:      SnakeIcon,
    name:      'Snake',
    desc:      'Điều khiển rắn săn mồi — tốc độ tăng dần theo điểm',
    tag:       'ARCADE',
    lsKey:     'snake_highscore',
    preview:   SnakePreview,
    gradient:  'linear-gradient(135deg, rgba(20,184,166,0.14) 0%, rgba(6,182,212,0.04) 100%)',
    border:    'rgba(20,184,166,0.32)',
    accent:    '#14b8a6',
    iconBg:    'rgba(20,184,166,0.16)',
    tagBg:     'rgba(20,184,166,0.14)',
    tagColor:  '#0d9488',
    playColor: '#2dd4bf',
  },
  {
    id:        'sudoku',
    icon:      Lightbulb,
    name:      'Sudoku',
    desc:      'Điền số 1–9 vào mỗi hàng, cột và ô 3×3',
    tag:       'PUZZLE',
    lsKey:     null,
    preview:   SudokuPreview,
    gradient:  'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(168,85,247,0.04) 100%)',
    border:    'rgba(99,102,241,0.32)',
    accent:    '#6366f1',
    iconBg:    'rgba(99,102,241,0.16)',
    tagBg:     'rgba(99,102,241,0.14)',
    tagColor:  '#4f46e5',
    playColor: '#818cf8',
  },
  {
    id:        'caro',
    icon:      CaroIcon,
    name:      'Caro',
    desc:      '2 người chơi — nối 5 ô liên tiếp trên bàn 20×20',
    tag:       'PvP',
    lsKey:     null,
    preview:   CaroPreview,
    gradient:  'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(244,63,94,0.04) 100%)',
    border:    'rgba(168,85,247,0.32)',
    accent:    '#a855f7',
    iconBg:    'rgba(168,85,247,0.16)',
    tagBg:     'rgba(168,85,247,0.14)',
    tagColor:  '#9333ea',
    playColor: '#c084fc',
  },
]

// ── Page ─────────────────────────────────────────────────────

export default function Game() {
  const [selected, setSelected] = useState(null)

  if (selected === 'bullbear') return <BullBear onBack={() => setSelected(null)} />
  if (selected === 'snake')    return <Snake    onBack={() => setSelected(null)} />
  if (selected === 'sudoku')   return <Sudoku   onBack={() => setSelected(null)} />
  if (selected === 'caro')     return <Caro     onBack={() => setSelected(null)} />

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">

      {/* ── Arcade header ── */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #38bdf8 100%)',
              boxShadow: '0 0 28px rgba(129,140,248,0.45), 0 0 56px rgba(192,132,252,0.2)',
            }}>
            <Gamepad2 size={30} className="text-white" strokeWidth={1.8} />
          </div>
          <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
            style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', animationDuration: '2.4s' }} />
        </div>
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
      <div className="flex flex-col gap-3 w-full max-w-md">
        {GAMES.map(g => {
          const best = g.lsKey ? parseInt(localStorage.getItem(g.lsKey) ?? '0') : 0
          const Preview = g.preview
          return (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className="game-picker-card flex items-stretch overflow-hidden rounded-2xl active:scale-[0.97] text-left h-[104px]"
              style={{
                background: g.gradient,
                border: `1px solid ${g.border}`,
                boxShadow: `0 0 0 rgba(0,0,0,0)`,
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 24px ${g.border}`}
              onMouseLeave={e => e.currentTarget.style.boxShadow = `0 0 0 rgba(0,0,0,0)`}
            >
              {/* Left: icon + info */}
              <div className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: g.iconBg }}>
                  <g.icon size={22} strokeWidth={1.8} style={{ color: g.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm" style={{ color: 'var(--t-strong)' }}>{g.name}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider shrink-0"
                      style={{ background: g.tagBg, color: g.tagColor }}>
                      {g.tag}
                    </span>
                  </div>
                  <p className="text-xs leading-snug" style={{ color: 'var(--t-faint)' }}>{g.desc}</p>
                  {best > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: g.accent }}>Best</span>
                      <span className="text-sm font-black tabular-nums leading-none" style={{ color: g.accent }}>{best}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: animated preview + PLAY on hover */}
              <div className="game-card-preview">
                <div className="preview-content">
                  <Preview />
                </div>
                <div className="game-card-play-btn" style={{ color: g.playColor }}>
                  PLAY →
                </div>
              </div>
            </button>
          )
        })}
      </div>

    </div>
  )
}
