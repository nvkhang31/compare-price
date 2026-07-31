import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react'

const CELL   = 20
const COLS   = 20
const ROWS   = 20
const W      = CELL * COLS   // 400px
const H      = CELL * ROWS   // 400px
const LS_KEY = 'snake_highscore'

function getSpeed(score) { return Math.max(90, 320 - score * 12) }

const DIR_MAP = {
  ArrowUp:    { x: 0,  y: -1 }, w: { x: 0,  y: -1 }, W: { x: 0,  y: -1 },
  ArrowDown:  { x: 0,  y:  1 }, s: { x: 0,  y:  1 }, S: { x: 0,  y:  1 },
  ArrowLeft:  { x: -1, y:  0 }, a: { x: -1, y:  0 }, A: { x: -1, y:  0 },
  ArrowRight: { x: 1,  y:  0 }, d: { x: 1,  y:  0 }, D: { x: 1,  y:  0 },
}

const INIT_SNAKE = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
const INIT_DIR   = { x: 1, y: 0 }

function randomFood(snake) {
  let pos
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (snake.some(s => s.x === pos.x && s.y === pos.y))
  return pos
}

export default function Snake({ onBack }) {
  const canvasRef  = useRef(null)
  const loopRef    = useRef(null)
  const gRef       = useRef(null)
  const tickRef    = useRef(null)

  const [phase,     setPhase]     = useState('idle')   // idle | playing | paused | over
  const [score,     setScore]     = useState(0)
  const [isNewBest, setIsNewBest] = useState(false)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(LS_KEY) ?? '0'))

  const stopLoop  = () => { clearInterval(loopRef.current); loopRef.current = null }
  const startLoop = (speed) => { stopLoop(); loopRef.current = setInterval(() => tickRef.current?.(), speed) }

  // ── Canvas draw ───────────────────────────────────────────

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const g   = gRef.current

    // Background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke()
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke()
    }

    if (!g) return

    // Food — glowing circle
    ctx.shadowBlur  = 10
    ctx.shadowColor = '#f87171'
    ctx.fillStyle   = '#f87171'
    ctx.beginPath()
    ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Snake body
    g.snake.forEach((seg, i) => {
      ctx.shadowBlur  = i === 0 ? 8 : 0
      ctx.shadowColor = '#22c55e'
      ctx.fillStyle   = i === 0 ? '#22c55e' : '#4ade80'
      ctx.beginPath()
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4)
      ctx.fill()
    })
    ctx.shadowBlur = 0

    // Snake eyes on head
    if (g.snake.length > 0) {
      const head = g.snake[0]
      const cx   = head.x * CELL + CELL / 2
      const cy   = head.y * CELL + CELL / 2
      const d    = g.dir
      // Front offset (direction of travel) and perpendicular offset
      const fx = d.x * 4, fy = d.y * 4   // forward
      const px = d.y * 3, py = -d.x * 3  // perpendicular
      ctx.fillStyle = '#fff'
      ;[[fx + px, fy + py], [fx - px, fy - py]].forEach(([ox, oy]) => {
        ctx.beginPath()
        ctx.arc(cx + ox, cy + oy, 2.2, 0, Math.PI * 2)
        ctx.fill()
        // Pupil
        ctx.fillStyle = '#0f172a'
        ctx.beginPath()
        ctx.arc(cx + ox + d.x * 0.8, cy + oy + d.y * 0.8, 1.1, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
      })
    }

    // Floating +1 popups
    if (g.popups?.length) {
      g.popups.forEach(p => {
        ctx.globalAlpha = p.alpha
        ctx.fillStyle   = '#4ade80'
        ctx.font        = 'bold 13px monospace'
        ctx.textAlign   = 'center'
        ctx.fillText('+1', p.x, p.y)
      })
      ctx.globalAlpha = 1
      ctx.textAlign   = 'left'
      // Advance popup animations
      g.popups = g.popups
        .map(p => ({ ...p, y: p.y - 1.2, alpha: p.alpha - 0.045 }))
        .filter(p => p.alpha > 0)
    }
  }

  // ── Game logic ────────────────────────────────────────────

  const handleGameOver = () => {
    stopLoop()
    const finalScore = gRef.current?.score ?? 0
    const prevBest   = parseInt(localStorage.getItem(LS_KEY) ?? '0')
    if (finalScore > prevBest) {
      setHighScore(finalScore)
      localStorage.setItem(LS_KEY, String(finalScore))
      setIsNewBest(true)
    }
    setPhase('over')
  }

  const tick = () => {
    const g = gRef.current
    if (!g || g.paused || g.over) return

    // Apply queued direction (block 180° reversal)
    const nd = g.nextDir
    if (!(nd.x === -g.dir.x && nd.y === -g.dir.y)) g.dir = { ...nd }

    const newHead = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y }

    // Wall or self collision → game over
    if (
      newHead.x < 0 || newHead.x >= COLS ||
      newHead.y < 0 || newHead.y >= ROWS ||
      g.snake.some(s => s.x === newHead.x && s.y === newHead.y)
    ) {
      g.over = true
      draw()
      handleGameOver()
      return
    }

    const ate      = newHead.x === g.food.x && newHead.y === g.food.y
    const newSnake = [newHead, ...g.snake]
    if (!ate) newSnake.pop()
    g.snake = newSnake

    if (ate) {
      g.score += 1
      g.popups = [...(g.popups ?? []), {
        x:     newHead.x * CELL + CELL / 2,
        y:     newHead.y * CELL + CELL / 2 - 4,
        alpha: 1,
      }]
      g.food = randomFood(newSnake)
      setScore(g.score)
      startLoop(getSpeed(g.score))  // re-schedule with new speed
    }

    draw()
  }

  // Keep tickRef always pointing at latest tick
  tickRef.current = tick

  // ── Controls ──────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      const g = gRef.current
      if (e.key === ' ') {
        e.preventDefault()
        if (!g || g.over) return
        g.paused = !g.paused
        setPhase(g.paused ? 'paused' : 'playing')
        return
      }
      const dir = DIR_MAP[e.key]
      if (dir) { e.preventDefault(); if (g) g.nextDir = dir }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => stopLoop(), [])

  // Draw idle canvas on mount
  useEffect(() => { draw() }, []) // eslint-disable-line

  // ── Start / restart ───────────────────────────────────────

  const startGame = () => {
    const snake     = INIT_SNAKE.map(s => ({ ...s }))
    gRef.current    = {
      snake,
      dir:     { ...INIT_DIR },
      nextDir: { ...INIT_DIR },
      food:    randomFood(snake),
      score:   0,
      paused:  false,
      over:    false,
      popups:  [],
    }
    setScore(0)
    setIsNewBest(false)
    setPhase('playing')
    startLoop(getSpeed(0))
    draw()
  }

  const togglePause = () => {
    const g = gRef.current
    if (!g || g.over) return
    g.paused = !g.paused
    setPhase(g.paused ? 'paused' : 'playing')
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Header */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: W }}>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--t-mid)' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
          onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}
        >
          <ArrowLeft size={14} /> Games
        </button>

        <div className="flex items-center gap-4 text-sm font-semibold" style={{ color: 'var(--t-mid)' }}>
          <span>Score <span style={{ color: 'var(--blue)' }}>{score}</span></span>
          <span>Best <span style={{ color: '#f59e0b' }}>{highScore}</span></span>
          {phase !== 'idle' && phase !== 'over' && (
            <button
              onClick={togglePause}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: 'var(--bd)', color: 'var(--t-mid)' }}
            >
              {phase === 'paused' ? <Play size={13} /> : <Pause size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: W, height: H,
          border: '1px solid var(--bd)',
          boxShadow: phase === 'playing' ? '0 0 18px rgba(34,197,94,0.35), 0 0 40px rgba(34,197,94,0.12)'
            : phase === 'over'    ? '0 0 18px rgba(239,68,68,0.40), 0 0 40px rgba(239,68,68,0.12)'
            : phase === 'paused'  ? '0 0 14px rgba(59,130,246,0.30)'
            : 'none',
          transition: 'box-shadow 0.4s ease',
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} />

        {/* Idle overlay */}
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(15,23,42,0.75)' }}>
            <p className="text-4xl">🐍</p>
            <p className="text-white font-bold text-lg">Snake</p>
            <button
              onClick={startGame}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--blue)' }}
            >
              Bắt đầu
            </button>
          </div>
        )}

        {/* Paused overlay */}
        {phase === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(15,23,42,0.65)' }}>
            <p className="text-white text-lg font-bold">⏸ Tạm dừng</p>
            <button
              onClick={togglePause}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--blue)' }}
            >
              <Play size={14} /> Tiếp tục
            </button>
          </div>
        )}

        {/* Game over overlay */}
        {phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(15,23,42,0.82)' }}>
            <p className="text-3xl">💀</p>
            <p className="text-white text-lg font-bold">Game Over</p>
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Score: <span className="text-white font-bold">{score}</span>
            </p>
            {isNewBest && (
              <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>🏆 Kỷ lục mới!</p>
            )}
            <button
              onClick={startGame}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-white mt-1"
              style={{ background: 'var(--blue)' }}
            >
              <RotateCcw size={13} /> Chơi lại
            </button>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <p className="text-xs" style={{ color: 'var(--t-ghost)' }}>
        ↑↓←→ hoặc WASD để di chuyển &nbsp;·&nbsp; Space để tạm dừng
      </p>
    </div>
  )
}
