import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Heart, Trophy, RotateCcw, Gamepad2 } from 'lucide-react'
import api from '../services/api'

const MAX_LIVES  = 3
const COUNTDOWN  = 10
const LS_KEY     = 'bullbear_highscore'

const PHASES = { IDLE: 'idle', PLAYING: 'playing', RESULT: 'result', GAMEOVER: 'gameover' }

export default function Game() {
  const [phase,     setPhase]     = useState(PHASES.IDLE)
  const [question,  setQuestion]  = useState(null)   // { symbol, exchange, answer }
  const [lives,     setLives]     = useState(MAX_LIVES)
  const [score,     setScore]     = useState(0)
  const [streak,    setStreak]    = useState(0)
  const [countdown, setCountdown] = useState(COUNTDOWN)
  const [result,    setResult]    = useState(null)   // 'correct' | 'wrong' | 'timeout'
  const [loading,   setLoading]   = useState(false)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(LS_KEY) ?? '0'))

  const timerRef    = useRef(null)
  const answerRef   = useRef(null) // stores correct answer during result phase

  // ── Helpers ────────────────────────────────────────────────

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function startCountdown(onExpire) {
    clearTimer()
    setCountdown(COUNTDOWN)
    let remaining = COUNTDOWN
    timerRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearTimer()
        onExpire()
      }
    }, 1000)
  }

  async function fetchQuestion() {
    setLoading(true)
    try {
      const data = await api.game.question()
      setQuestion(data)
      answerRef.current = data.answer
      setResult(null)
      setPhase(PHASES.PLAYING)
      startCountdown(() => handleTimeout())
    } catch {
      // no data — treat as no question, stay on idle
      setPhase(PHASES.IDLE)
    } finally {
      setLoading(false)
    }
  }

  function handleStart() {
    setLives(MAX_LIVES)
    setScore(0)
    setStreak(0)
    fetchQuestion()
  }

  function handleTimeout() {
    clearTimer()
    setResult('timeout')
    setPhase(PHASES.RESULT)
    const newLives = lives - 1
    setLives(newLives)
    setStreak(0)
    setTimeout(() => {
      if (newLives <= 0) {
        endGame(score)
      } else {
        fetchQuestion()
      }
    }, 1800)
  }

  function handleAnswer(choice) {
    if (phase !== PHASES.PLAYING) return
    clearTimer()

    const correct  = choice === answerRef.current
    const newScore  = correct ? score + 1 : score
    const newStreak = correct ? streak + 1 : 0
    const newLives  = correct ? lives : lives - 1

    setResult(correct ? 'correct' : 'wrong')
    setScore(newScore)
    setStreak(newStreak)
    setLives(newLives)
    setPhase(PHASES.RESULT)

    setTimeout(() => {
      if (newLives <= 0) {
        endGame(newScore)
      } else {
        fetchQuestion()
      }
    }, 1400)
  }

  function endGame(finalScore) {
    clearTimer()
    if (finalScore > highScore) {
      setHighScore(finalScore)
      localStorage.setItem(LS_KEY, String(finalScore))
    }
    setPhase(PHASES.GAMEOVER)
  }

  useEffect(() => () => clearTimer(), [])

  // ── Sub-components ─────────────────────────────────────────

  const LivesBar = () => (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: MAX_LIVES }).map((_, i) => (
        <Heart
          key={i}
          size={18}
          className={i < lives ? 'text-red-500' : 'opacity-20'}
          fill={i < lives ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  )

  const ScoreRow = () => (
    <div className="flex items-center gap-4 text-sm font-semibold" style={{ color: 'var(--t-mid)' }}>
      <span>Score <span style={{ color: 'var(--blue)' }}>{score}</span></span>
      {streak >= 2 && (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
          🔥 {streak} streak
        </span>
      )}
    </div>
  )

  // Countdown ring
  const CountdownRing = () => {
    const pct = (countdown / COUNTDOWN) * 100
    const r   = 22
    const circ = 2 * Math.PI * r
    const dash = (pct / 100) * circ
    const color = countdown <= 3 ? 'var(--red)' : countdown <= 6 ? '#f59e0b' : 'var(--blue)'
    return (
      <div className="relative flex items-center justify-center w-14 h-14">
        <svg width="56" height="56" className="absolute -rotate-90">
          <circle cx="28" cy="28" r={r} stroke="var(--bd)" strokeWidth="3" fill="none" />
          <circle cx="28" cy="28" r={r}
            stroke={color} strokeWidth="3" fill="none"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
          />
        </svg>
        <span className="text-lg font-bold tabular-nums" style={{ color }}>{countdown}</span>
      </div>
    )
  }

  // ── Screens ────────────────────────────────────────────────

  if (phase === PHASES.IDLE) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--tint-blue)' }}>
          <Gamepad2 size={32} style={{ color: 'var(--blue)' }} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--t-strong)' }}>Bull or Bear</h1>
        <p className="text-sm" style={{ color: 'var(--t-mid)' }}>
          Đoán giá TC hôm nay tăng hay giảm so với hôm qua
        </p>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--t-faint)' }}>
          <Heart size={14} fill="currentColor" className="text-red-400" /> {MAX_LIVES} lives
          &nbsp;·&nbsp; ⏱ {COUNTDOWN}s / câu
        </div>
        {highScore > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-semibold mt-1"
            style={{ color: 'var(--t-mid)' }}>
            <Trophy size={14} style={{ color: '#f59e0b' }} />
            High score: {highScore}
          </div>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-50"
        style={{ background: 'var(--blue)' }}
      >
        {loading ? 'Đang tải...' : 'Bắt đầu chơi'}
      </button>
    </div>
  )

  if (phase === PHASES.GAMEOVER) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center space-y-1">
        <p className="text-4xl">💀</p>
        <h2 className="text-xl font-bold mt-3" style={{ color: 'var(--t-strong)' }}>Game Over</h2>
        <p className="text-sm" style={{ color: 'var(--t-mid)' }}>
          Score: <span className="font-bold" style={{ color: 'var(--blue)' }}>{score}</span>
        </p>
        {score >= highScore && score > 0 && (
          <p className="text-xs font-semibold mt-1" style={{ color: '#f59e0b' }}>
            🏆 Kỷ lục mới!
          </p>
        )}
        {highScore > 0 && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--t-faint)' }}>
            High score: {highScore}
          </p>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-50"
        style={{ background: 'var(--blue)' }}
      >
        <RotateCcw size={14} />
        Chơi lại
      </button>
    </div>
  )

  // PLAYING + RESULT phases
  const isResult  = phase === PHASES.RESULT
  const isCorrect = result === 'correct'
  const isTimeout = result === 'timeout'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 select-none">

      {/* Status bar */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <LivesBar />
        <CountdownRing />
        <ScoreRow />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl p-8 text-center transition-all duration-200 shadow-sm"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--bd)',
          outline: isResult
            ? `2px solid ${isTimeout ? '#f59e0b' : isCorrect ? 'var(--green)' : 'var(--red)'}`
            : '2px solid transparent',
        }}>

        {/* Symbol */}
        <p className="text-5xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--t-strong)' }}>
          {question?.symbol}
        </p>
        <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded"
          style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
          {question?.exchange}
        </span>

        {/* Result feedback */}
        {isResult && (
          <p className="mt-4 text-sm font-semibold"
            style={{ color: isTimeout ? '#f59e0b' : isCorrect ? 'var(--green)' : 'var(--red)' }}>
            {isTimeout ? '⏰ Hết giờ!' : isCorrect ? '✓ Chính xác!' : '✗ Sai rồi!'}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-4 w-full max-w-sm">
        <button
          onClick={() => handleAnswer('bull')}
          disabled={isResult}
          className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          style={{
            background: isResult && answerRef.current === 'bull' ? 'var(--tint-green)' : 'var(--card)',
            border: `2px solid ${isResult && answerRef.current === 'bull' ? 'var(--green)' : 'var(--bd)'}`,
            color: 'var(--green-strong)',
          }}
        >
          <TrendingUp size={28} strokeWidth={2} />
          Bull ▲
        </button>

        <button
          onClick={() => handleAnswer('bear')}
          disabled={isResult}
          className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          style={{
            background: isResult && answerRef.current === 'bear' ? 'var(--tint-red)' : 'var(--card)',
            border: `2px solid ${isResult && answerRef.current === 'bear' ? 'var(--red)' : 'var(--bd)'}`,
            color: 'var(--red-strong)',
          }}
        >
          <TrendingDown size={28} strokeWidth={2} />
          Bear ▼
        </button>
      </div>

    </div>
  )
}
