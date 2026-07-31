import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'

// ── Puzzle generation ──────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isValidPlacement(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false
    if (board[i][col] === num) return false
  }
  const br = Math.floor(row / 3) * 3
  const bc = Math.floor(col / 3) * 3
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (board[r][c] === num) return false
  return true
}

function fillBoard(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== 0) continue
      for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (isValidPlacement(board, row, col, num)) {
          board[row][col] = num
          if (fillBoard(board)) return true
          board[row][col] = 0
        }
      }
      return false
    }
  }
  return true
}

const REMOVE_COUNT = { easy: 36, medium: 46, hard: 54 }

function generatePuzzle(difficulty) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0))
  fillBoard(board)
  const puzzle = board.map(r => [...r])
  const cells  = shuffle([...Array(81).keys()])
  for (let i = 0; i < REMOVE_COUNT[difficulty]; i++) {
    puzzle[Math.floor(cells[i] / 9)][cells[i] % 9] = 0
  }
  return puzzle
}

// ── Game helpers ───────────────────────────────────────────────────────────

function getConflicts(board) {
  const set = new Set()
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c]
      if (!v) continue
      for (let i = 0; i < 9; i++) {
        if (i !== c && board[r][i] === v) { set.add(`${r},${c}`); set.add(`${r},${i}`) }
        if (i !== r && board[i][c] === v) { set.add(`${r},${c}`); set.add(`${i},${c}`) }
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
      for (let rr = br; rr < br + 3; rr++)
        for (let cc = bc; cc < bc + 3; cc++)
          if ((rr !== r || cc !== c) && board[rr][cc] === v) {
            set.add(`${r},${c}`); set.add(`${rr},${cc}`)
          }
    }
  }
  return set
}

function sameGroup(r1, c1, r2, c2) {
  return r1 === r2 || c1 === c2 ||
    (Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3))
}

function isComplete(board) {
  return board.every(row => row.every(v => v !== 0))
}

// ── Constants ──────────────────────────────────────────────────────────────

const DIFFICULTIES = [
  { id: 'easy',   label: 'Dễ',  sub: '45 ô cho sẵn' },
  { id: 'medium', label: 'Vừa', sub: '35 ô cho sẵn' },
  { id: 'hard',   label: 'Khó', sub: '27 ô cho sẵn' },
]

// ── Component ──────────────────────────────────────────────────────────────

export default function Sudoku({ onBack }) {
  const [difficulty, setDifficulty] = useState('easy')
  const [phase,      setPhase]      = useState('idle')   // idle | playing | won
  const [board,      setBoard]      = useState(null)
  const [given,      setGiven]      = useState(null)
  const [selected,   setSelected]   = useState(null)     // { row, col }
  const [conflicts,  setConflicts]  = useState(new Set())

  const startGame = useCallback((diff) => {
    const puzzle  = generatePuzzle(diff)
    setBoard(puzzle)
    setGiven(puzzle.map(row => row.map(v => v !== 0)))
    setSelected(null)
    setConflicts(new Set())
    setPhase('playing')
  }, [])

  const fillCell = useCallback((num) => {
    if (!selected) return
    const { row, col } = selected
    setBoard(prev => {
      if (!prev || given?.[row]?.[col]) return prev
      const next = prev.map(r => [...r])
      next[row][col] = num
      const c = getConflicts(next)
      setConflicts(c)
      if (isComplete(next) && c.size === 0) setPhase('won')
      return next
    })
  }, [selected, given])

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (phase !== 'playing') return
      const n = parseInt(e.key)
      if (n >= 1 && n <= 9) { e.preventDefault(); fillCell(n); return }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault(); fillCell(0); return
      }
      const ARROW = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] }
      if (ARROW[e.key]) {
        e.preventDefault()
        const [dr, dc] = ARROW[e.key]
        setSelected(s => s
          ? { row: Math.max(0, Math.min(8, s.row + dr)), col: Math.max(0, Math.min(8, s.col + dc)) }
          : { row: 0, col: 0 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, fillCell])

  // ── Back button ────────────────────────────────────────────────────────

  const BackBtn = () => (
    <button onClick={onBack}
      className="self-start inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
      style={{ color: 'var(--t-mid)' }}
      onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
      onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}>
      <ArrowLeft size={14} /> Games
    </button>
  )

  // ── Idle screen ────────────────────────────────────────────────────────

  if (phase === 'idle') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-7">
      <BackBtn />
      <div className="text-center -mt-4">
        <p className="text-4xl mb-3">🔢</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--t-strong)' }}>Sudoku</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-mid)' }}>
          Điền số 1–9 vào mỗi hàng, cột và ô 3×3
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {DIFFICULTIES.map(d => (
          <button key={d.id} onClick={() => setDifficulty(d.id)}
            className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
            style={{
              background: difficulty === d.id ? 'var(--tint-blue)' : 'var(--card)',
              border: `2px solid ${difficulty === d.id ? 'var(--blue)' : 'var(--bd)'}`,
            }}>
            <span className="font-semibold text-sm"
              style={{ color: difficulty === d.id ? 'var(--blue)' : 'var(--t-strong)' }}>
              {d.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--t-faint)' }}>{d.sub}</span>
          </button>
        ))}
      </div>

      <button onClick={() => startGame(difficulty)}
        className="px-8 py-3 rounded-xl font-bold text-white text-sm"
        style={{ background: 'var(--blue)' }}>
        Bắt đầu
      </button>
    </div>
  )

  // ── Won screen ─────────────────────────────────────────────────────────

  if (phase === 'won') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <BackBtn />
      <div className="text-center -mt-4">
        <p className="text-4xl mb-3">🎉</p>
        <h2 className="text-xl font-bold" style={{ color: 'var(--t-strong)' }}>Hoàn thành!</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--t-mid)' }}>
          Bạn đã giải xong mức <span className="font-semibold">
            {DIFFICULTIES.find(d => d.id === difficulty)?.label}
          </span>
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => startGame(difficulty)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm"
          style={{ background: 'var(--blue)' }}>
          <RotateCcw size={14} /> Ván mới
        </button>
        <button onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
          Games
        </button>
      </div>
    </div>
  )

  // ── Playing screen ─────────────────────────────────────────────────────

  if (!board || !given) return null

  const selR = selected?.row
  const selC = selected?.col
  const selV = selected != null ? board[selR][selC] : 0

  return (
    <div className="flex flex-col items-center gap-5 select-none">

      {/* Header */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: 360 }}>
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--t-mid)' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
          onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}>
          <ArrowLeft size={14} /> Games
        </button>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
          {DIFFICULTIES.find(d => d.id === difficulty)?.label}
        </span>
        <button onClick={() => startGame(difficulty)}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--t-mid)' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
          onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}>
          <RotateCcw size={13} /> Ván mới
        </button>
      </div>

      {/* 9×9 Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(9, 1fr)',
        width: 'min(360px, 100vw - 32px)',
        border: '2px solid var(--t-mid)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {board.map((rowArr, r) => rowArr.map((val, c) => {
          const key        = `${r},${c}`
          const isSelected = selR === r && selC === c
          const isConflict = conflicts.has(key)
          const isGiven_   = given[r][c]
          const inGroup    = selected != null && sameGroup(r, c, selR, selC)
          const sameVal    = selV && val === selV && !isSelected

          let bg = 'var(--card)'
          if      (isConflict) bg = 'rgba(239,68,68,0.18)'
          else if (isSelected) bg = 'rgba(59,130,246,0.28)'
          else if (sameVal)    bg = 'rgba(59,130,246,0.14)'
          else if (inGroup)    bg = 'rgba(59,130,246,0.06)'

          return (
            <div key={key}
              onClick={() => setSelected({ row: r, col: c })}
              style={{
                aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: bg,
                borderRight: (c + 1) % 3 === 0 && c !== 8
                  ? '2px solid var(--t-mid)' : '1px solid var(--bd)',
                borderBottom: (r + 1) % 3 === 0 && r !== 8
                  ? '2px solid var(--t-mid)' : '1px solid var(--bd)',
                cursor: isGiven_ ? 'default' : 'pointer',
                fontSize: 'clamp(13px, 3.8vw, 19px)',
                fontWeight: isGiven_ ? 700 : 500,
                color: isConflict ? 'var(--red-strong)'
                  : isGiven_ ? 'var(--t-strong)'
                  : 'var(--blue)',
                transition: 'background 0.08s',
              }}>
              {val !== 0 ? val : ''}
            </div>
          )
        }))}
      </div>

      {/* Number pad: 1–9 + erase */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
        width: 'min(360px, 100vw - 32px)',
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => fillCell(n)}
            className="rounded-xl font-bold transition-all active:scale-95"
            style={{
              aspectRatio: '1', fontSize: 20,
              background: 'var(--card)',
              border: '1px solid var(--bd)',
              color: 'var(--blue)',
            }}>
            {n}
          </button>
        ))}
        <button onClick={() => fillCell(0)}
          className="rounded-xl font-bold transition-all active:scale-95"
          style={{
            aspectRatio: '1', fontSize: 18,
            background: 'var(--card)',
            border: '1px solid var(--bd)',
            color: 'var(--t-faint)',
          }}>
          ✕
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--t-ghost)' }}>
        Nhấn số hoặc dùng bàn phím · ← → ↑ ↓ để di chuyển
      </p>

    </div>
  )
}
