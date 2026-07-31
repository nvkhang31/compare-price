import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, RotateCcw, Trophy, Loader2 } from 'lucide-react'
import api from '../services/api'

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

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
  // phase: idle | playing | won | leaderboard
  const [phase,      setPhase]      = useState('idle')
  const [board,      setBoard]      = useState(null)
  const [given,      setGiven]      = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [conflicts,  setConflicts]  = useState(new Set())

  // Timer
  const timerRef   = useRef(null)
  const elapsedRef = useRef(0)
  const winTimeRef = useRef(0)
  const [elapsed,  setElapsed]  = useState(0)

  // Score submission
  const submitAttemptedRef = useRef(false)
  const [nickname,    setNickname]    = useState(() => localStorage.getItem('sudoku_nickname') ?? '')
  const [nicknameSet, setNicknameSet] = useState(() => !!localStorage.getItem('sudoku_nickname'))
  const [submitted,   setSubmitted]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [rank,        setRank]        = useState(null)
  const [submitError, setSubmitError] = useState(false)

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([])
  const [lbDiff,      setLbDiff]      = useState('easy')
  const [lbLoading,   setLbLoading]   = useState(false)

  // ── Timer helpers ────────────────────────────────────────────

  function startTimer() {
    clearInterval(timerRef.current)
    elapsedRef.current = 0
    setElapsed(0)
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
    }, 1000)
  }

  function stopTimer() {
    clearInterval(timerRef.current)
    timerRef.current = null
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  // ── Score submission ─────────────────────────────────────────

  async function handleSubmitScore(name) {
    const n = (name ?? nickname).trim()
    if (!n) return
    setSubmitting(true)
    setSubmitError(false)
    try {
      localStorage.setItem('sudoku_nickname', n)
      setNickname(n)
      const res = await api.sudoku.submitScore({ nickname: n, time: winTimeRef.current, difficulty })
      setRank(res.rank)
      setSubmitted(true)
    } catch {
      setSubmitError(true)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  // Auto-submit when won — nickname is always set before playing
  useEffect(() => {
    if (phase !== 'won') return
    if (submitAttemptedRef.current) return
    submitAttemptedRef.current = true
    handleSubmitScore(nickname)
  }, [phase]) // eslint-disable-line

  // ── Leaderboard ──────────────────────────────────────────────

  async function fetchLeaderboard(diff) {
    setLbLoading(true)
    try {
      const data = await api.sudoku.leaderboard(diff)
      setLeaderboard(data)
    } catch {
      setLeaderboard([])
    } finally {
      setLbLoading(false)
    }
  }

  function openLeaderboard(diff) {
    const d = diff ?? lbDiff
    setLbDiff(d)
    setPhase('leaderboard')
    fetchLeaderboard(d)
  }

  // ── Game ─────────────────────────────────────────────────────

  function startGame(diff) {
    if (nickname.trim()) {
      localStorage.setItem('sudoku_nickname', nickname.trim())
      setNicknameSet(true)
    }
    const puzzle = generatePuzzle(diff)
    setBoard(puzzle)
    setGiven(puzzle.map(row => row.map(v => v !== 0)))
    setSelected(null)
    setConflicts(new Set())
    setSubmitted(false)
    setRank(null)
    setSubmitting(false)
    setSubmitError(false)
    submitAttemptedRef.current = false
    setPhase('playing')
    startTimer()
  }

  const fillCell = useCallback((num) => {
    if (!selected) return
    const { row, col } = selected
    setBoard(prev => {
      if (!prev || given?.[row]?.[col]) return prev
      const next = prev.map(r => [...r])
      next[row][col] = num
      const c = getConflicts(next)
      setConflicts(c)
      if (isComplete(next) && c.size === 0) {
        stopTimer()
        winTimeRef.current = elapsedRef.current
        setPhase('won')
      }
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

  // ── Shared sub-components ────────────────────────────────────

  const BackBtn = ({ label = 'Games', onClick }) => (
    <button
      onClick={onClick ?? onBack}
      className="self-start inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
      style={{ color: 'var(--t-mid)' }}
      onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
      onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}>
      <ArrowLeft size={14} /> {label}
    </button>
  )

  // ── Leaderboard screen ───────────────────────────────────────

  if (phase === 'leaderboard') {
    const myNickname = localStorage.getItem('sudoku_nickname') ?? ''
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
        <div className="flex items-center justify-between w-full">
          <BackBtn label="Quay lại" onClick={() => setPhase('idle')} />
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
            Bảng xếp hạng
          </span>
        </div>

        {/* Trophy header */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 0 20px rgba(245,158,11,0.35)' }}>
            <Trophy size={22} className="text-white" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--t-strong)' }}>Top 10</p>
        </div>

        {/* Difficulty tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-full" style={{ background: 'var(--card)', border: '1px solid var(--bd)' }}>
          {DIFFICULTIES.map(d => (
            <button key={d.id}
              onClick={() => { setLbDiff(d.id); fetchLeaderboard(d.id) }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: lbDiff === d.id ? 'var(--blue)' : 'transparent',
                color:      lbDiff === d.id ? 'white'      : 'var(--t-faint)',
              }}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Leaderboard table */}
        <div className="w-full rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bd)' }}>
          {lbLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--blue)' }} />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--t-faint)' }}>
              Chưa có dữ liệu — hãy là người đầu tiên!
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--card)', borderBottom: '1px solid var(--bd)' }}>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold" style={{ color: 'var(--t-faint)', width: 36 }}>#</th>
                  <th className="py-2.5 px-3 text-left text-xs font-semibold" style={{ color: 'var(--t-faint)' }}>Tên</th>
                  <th className="py-2.5 px-3 text-right text-xs font-semibold" style={{ color: 'var(--t-faint)' }}>Thời gian</th>
                  <th className="py-2.5 px-3 text-right text-xs font-semibold" style={{ color: 'var(--t-faint)', whiteSpace: 'nowrap' }}>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((s, i) => {
                  const isMe = s.nickname === myNickname
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                  return (
                    <tr key={i}
                      style={{
                        background: isMe ? 'var(--tint-blue)' : i % 2 === 0 ? 'var(--card)' : 'transparent',
                        borderBottom: '1px solid var(--bd)',
                      }}>
                      <td className="py-2.5 px-3 text-center font-bold tabular-nums"
                        style={{ color: medal ? 'inherit' : 'var(--t-faint)', fontSize: medal ? 14 : 12 }}>
                        {medal ?? i + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold truncate max-w-[120px]"
                        style={{ color: isMe ? 'var(--blue)' : 'var(--t-strong)' }}>
                        {s.nickname}{isMe && ' (bạn)'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums"
                        style={{ color: i === 0 ? '#f59e0b' : 'var(--t-strong)' }}>
                        {formatTime(s.time)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs" style={{ color: 'var(--t-faint)', whiteSpace: 'nowrap' }}>
                        {formatDate(s.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <button onClick={() => startGame(lbDiff)}
          className="w-full py-2.5 rounded-xl font-bold text-white text-sm"
          style={{ background: 'var(--blue)' }}>
          Chơi ngay ({DIFFICULTIES.find(d => d.id === lbDiff)?.label})
        </button>
      </div>
    )
  }

  // ── Idle screen ───────────────────────────────────────────────

  if (phase === 'idle') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-7">
      <BackBtn />
      <div className="text-center -mt-4">

        <div className="flex justify-center mb-4">
          <div className="game-logo-ring game-logo-ring--sudoku">
            <div className="game-logo-ring-inner">
              <svg width="33" height="33" viewBox="0 0 33 33" fill="none">
                <rect x="1" y="1" width="31" height="31" rx="3" stroke="#818cf8" strokeWidth="1" fill="none" opacity="0.45" />
                <line x1="11.7" y1="1" x2="11.7" y2="32" stroke="#818cf8" strokeWidth="0.8" opacity="0.35" />
                <line x1="21.3" y1="1" x2="21.3" y2="32" stroke="#818cf8" strokeWidth="0.8" opacity="0.35" />
                <line x1="1" y1="11.7" x2="32" y2="11.7" stroke="#818cf8" strokeWidth="0.8" opacity="0.35" />
                <line x1="1" y1="21.3" x2="32" y2="21.3" stroke="#818cf8" strokeWidth="0.8" opacity="0.35" />
                <text x="6.5" y="6.8" fontSize="7.5" fill="#a5b4fc" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num">5</text>
                <text x="16.5" y="6.8" fontSize="7.5" fill="#c7d2fe" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num game-sudoku-n2">3</text>
                <text x="26.5" y="16.5" fontSize="7.5" fill="#a5b4fc" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num game-sudoku-n3">7</text>
                <text x="6.5" y="26.5" fontSize="7.5" fill="#c7d2fe" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num game-sudoku-n4">1</text>
                <text x="16.5" y="26.5" fontSize="7.5" fill="#a5b4fc" textAnchor="middle" dominantBaseline="middle" className="game-sudoku-num game-sudoku-n5">9</text>
              </svg>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--t-strong)' }}>Sudoku</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-mid)' }}>
          Điền số 1–9 vào mỗi hàng, cột và ô 3×3
        </p>
      </div>

      {/* Nickname input */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        <label className="text-xs font-semibold" style={{ color: 'var(--t-mid)' }}>
          Nickname của bạn
        </label>
        {nicknameSet && nickname ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--tint-blue)', border: '1px solid var(--blue)' }}>
            <span className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--blue)' }}>
              {nickname}
            </span>
            <button
              onClick={() => setNicknameSet(false)}
              className="text-xs font-semibold shrink-0"
              style={{ color: 'var(--blue)', opacity: 0.7 }}>
              Đổi
            </button>
          </div>
        ) : (
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nickname.trim() && startGame(difficulty)}
            placeholder="Nhập nickname..."
            maxLength={30}
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--bd)',
              color: 'var(--t-strong)',
            }}
          />
        )}
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

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={() => startGame(difficulty)}
          disabled={!nickname.trim()}
          className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40"
          style={{ background: 'var(--blue)' }}>
          Bắt đầu
        </button>
        <button onClick={() => openLeaderboard(difficulty)}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-sm transition-colors"
          style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
          <Trophy size={15} style={{ color: '#f59e0b' }} />
          BXH
        </button>
      </div>
    </div>
  )

  // ── Won screen ────────────────────────────────────────────────

  if (phase === 'won') {
    const winTime = winTimeRef.current
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <BackBtn />
        <div className="text-center -mt-4 space-y-1">
          <p className="text-4xl">🎉</p>
          <h2 className="text-xl font-bold" style={{ color: 'var(--t-strong)' }}>Hoàn thành!</h2>
          <p className="text-sm" style={{ color: 'var(--t-mid)' }}>
            Mức <span className="font-semibold">{DIFFICULTIES.find(d => d.id === difficulty)?.label}</span>
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mt-2"
            style={{ background: 'var(--tint-blue)', border: '1px solid var(--blue)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>⏱ Thời gian</span>
            <span className="font-mono font-black text-lg tabular-nums" style={{ color: 'var(--blue)' }}>
              {formatTime(winTime)}
            </span>
          </div>
        </div>

        {/* Rank result */}
        <div className="w-full max-w-xs rounded-2xl p-4 flex flex-col items-center gap-2"
          style={{ background: 'var(--card)', border: '1px solid var(--bd)', minHeight: 72 }}>
          {submitting && (
            <div className="flex items-center gap-2 py-1" style={{ color: 'var(--t-faint)' }}>
              <Loader2 size={15} className="animate-spin" />
              <span className="text-xs">Đang lưu điểm...</span>
            </div>
          )}
          {submitted && !submitError && rank && (
            <>
              <p className="text-2xl font-black" style={{ color: rank <= 3 ? '#f59e0b' : 'var(--blue)' }}>
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
              </p>
              <p className="text-xs" style={{ color: 'var(--t-faint)' }}>
                Hạng {rank} — {nickname}
              </p>
            </>
          )}
          {submitted && submitError && (
            <p className="text-xs text-center" style={{ color: 'var(--t-faint)' }}>
              Không thể lưu điểm lên BXH
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => startGame(difficulty)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
            style={{ background: 'var(--blue)' }}>
            <RotateCcw size={14} /> Ván mới
          </button>
          <button onClick={() => openLeaderboard(difficulty)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
            <Trophy size={14} style={{ color: '#f59e0b' }} /> BXH
          </button>
          <button onClick={onBack}
            className="inline-flex items-center px-4 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
            Games
          </button>
        </div>
      </div>
    )
  }

  // ── Playing screen ────────────────────────────────────────────

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

        {/* Timer — centered */}
        <span className="font-mono font-black text-base tabular-nums px-3 py-1 rounded-lg"
          style={{ background: 'var(--tint-blue)', color: 'var(--blue)', letterSpacing: '0.04em' }}>
          {formatTime(elapsed)}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
            {DIFFICULTIES.find(d => d.id === difficulty)?.label}
          </span>
          <button onClick={() => startGame(difficulty)}
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--t-mid)' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
            onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}>
            <RotateCcw size={13} />
          </button>
        </div>
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

      {/* Number pad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
        width: 'min(360px, 100vw - 32px)',
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => fillCell(n)}
            className="rounded-xl font-bold transition-all active:scale-95"
            style={{ aspectRatio: '1', fontSize: 20, background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--blue)' }}>
            {n}
          </button>
        ))}
        <button onClick={() => fillCell(0)}
          className="rounded-xl font-bold transition-all active:scale-95"
          style={{ aspectRatio: '1', fontSize: 18, background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-faint)' }}>
          ✕
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--t-ghost)' }}>
        Nhấn số hoặc dùng bàn phím · ← → ↑ ↓ để di chuyển
      </p>
    </div>
  )
}
