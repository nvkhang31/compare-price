import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Heart, Trophy, RotateCcw, ArrowLeft } from 'lucide-react'
import api from '../services/api'

const MAX_LIVES  = 3
const COUNTDOWN  = 10
const LS_KEY     = 'bullbear_highscore'
const PHASES     = { IDLE: 'idle', PLAYING: 'playing', RESULT: 'result', GAMEOVER: 'gameover' }

export default function BullBear({ onBack }) {
  const [phase,     setPhase]     = useState(PHASES.IDLE)
  const [question,  setQuestion]  = useState(null)
  const [lives,     setLives]     = useState(MAX_LIVES)
  const [score,     setScore]     = useState(0)
  const [streak,    setStreak]    = useState(0)
  const [countdown, setCountdown] = useState(COUNTDOWN)
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(LS_KEY) ?? '0'))

  const timerRef  = useRef(null)
  const answerRef = useRef(null)
  const livesRef  = useRef(MAX_LIVES)
  const scoreRef  = useRef(0)

  function clearTimer() { if (timerRef.current) clearInterval(timerRef.current) }

  function startCountdown(onExpire) {
    clearTimer()
    setCountdown(COUNTDOWN)
    let remaining = COUNTDOWN
    timerRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) { clearTimer(); onExpire() }
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
      startCountdown(handleTimeout)
    } catch {
      setPhase(PHASES.IDLE)
    } finally {
      setLoading(false)
    }
  }

  function handleStart() {
    livesRef.current = MAX_LIVES
    scoreRef.current = 0
    setLives(MAX_LIVES)
    setScore(0)
    setStreak(0)
    fetchQuestion()
  }

  function handleTimeout() {
    clearTimer()
    setResult('timeout')
    setPhase(PHASES.RESULT)
    const newLives = livesRef.current - 1
    livesRef.current = newLives
    setLives(newLives)
    setStreak(0)
    setTimeout(() => {
      if (newLives <= 0) endGame(scoreRef.current)
      else fetchQuestion()
    }, 1800)
  }

  function handleAnswer(choice) {
    if (phase !== PHASES.PLAYING) return
    clearTimer()
    const correct   = choice === answerRef.current
    const newScore  = correct ? scoreRef.current + 1 : scoreRef.current
    const newStreak = correct ? streak + 1 : 0
    const newLives  = correct ? livesRef.current : livesRef.current - 1
    livesRef.current = newLives
    scoreRef.current = newScore
    setResult(correct ? 'correct' : 'wrong')
    setScore(newScore)
    setStreak(newStreak)
    setLives(newLives)
    setPhase(PHASES.RESULT)
    setTimeout(() => {
      if (newLives <= 0) endGame(newScore)
      else fetchQuestion()
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
        <Heart key={i} size={18}
          className={i < lives ? 'text-red-500' : 'opacity-20'}
          fill={i < lives ? 'currentColor' : 'none'}
          strokeWidth={1.5} />
      ))}
    </div>
  )

  const CountdownRing = () => {
    const pct   = (countdown / COUNTDOWN) * 100
    const r     = 22
    const circ  = 2 * Math.PI * r
    const dash  = (pct / 100) * circ
    const color = countdown <= 3 ? 'var(--red)' : countdown <= 6 ? '#f59e0b' : 'var(--blue)'
    return (
      <div className="relative flex items-center justify-center w-14 h-14">
        <svg width="56" height="56" className="absolute -rotate-90">
          <circle cx="28" cy="28" r={r} stroke="var(--bd)" strokeWidth="3" fill="none" />
          <circle cx="28" cy="28" r={r}
            stroke={color} strokeWidth="3" fill="none"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }} />
        </svg>
        <span className="text-lg font-bold tabular-nums" style={{ color }}>{countdown}</span>
      </div>
    )
  }

  // ── Idle screen ────────────────────────────────────────────

  if (phase === PHASES.IDLE) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <button onClick={onBack}
        className="self-start inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: 'var(--t-mid)' }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
        onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}>
        <ArrowLeft size={14} /> Games
      </button>

      <div className="text-center space-y-2 -mt-4">
        <div className="flex justify-center mb-4">
          <div className="game-logo-ring game-logo-ring--bull">
            <div className="game-logo-ring-inner">
              <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
                <polyline
                  className="game-chart-line"
                  points="2,18 6,12 10,15 14,7 18,10 24,4 30,2"
                  stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                />
                <circle cx="30" cy="2" r="2" fill="#86efac" />
                <circle cx="30" cy="2" r="2" fill="#86efac" className="game-chart-ping" />
              </svg>
            </div>
          </div>
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

      <button onClick={handleStart} disabled={loading}
        className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-opacity disabled:opacity-50"
        style={{ background: 'var(--blue)' }}>
        {loading ? 'Đang tải...' : 'Bắt đầu chơi'}
      </button>
    </div>
  )

  // ── Game over screen ───────────────────────────────────────

  if (phase === PHASES.GAMEOVER) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <button onClick={onBack}
        className="self-start inline-flex items-center gap-1.5 text-sm font-medium"
        style={{ color: 'var(--t-mid)' }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
        onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}>
        <ArrowLeft size={14} /> Games
      </button>

      <div className="text-center space-y-1 -mt-4">
        <p className="text-4xl">💀</p>
        <h2 className="text-xl font-bold mt-3" style={{ color: 'var(--t-strong)' }}>Game Over</h2>
        <p className="text-sm" style={{ color: 'var(--t-mid)' }}>
          Score: <span className="font-bold" style={{ color: 'var(--blue)' }}>{score}</span>
        </p>
        {score >= highScore && score > 0 && (
          <p className="text-xs font-semibold mt-1" style={{ color: '#f59e0b' }}>🏆 Kỷ lục mới!</p>
        )}
        {highScore > 0 && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--t-faint)' }}>High score: {highScore}</p>
        )}
      </div>

      <button onClick={handleStart} disabled={loading}
        className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50"
        style={{ background: 'var(--blue)' }}>
        <RotateCcw size={14} /> Chơi lại
      </button>
    </div>
  )

  // ── Playing / Result screen ────────────────────────────────

  const isResult  = phase === PHASES.RESULT
  const isCorrect = result === 'correct'
  const isTimeout = result === 'timeout'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 select-none">
      <div className="flex items-center justify-between w-full max-w-sm">
        <LivesBar />
        <CountdownRing />
        <div className="flex items-center gap-4 text-sm font-semibold" style={{ color: 'var(--t-mid)' }}>
          <span>Score <span style={{ color: 'var(--blue)' }}>{score}</span></span>
          {streak >= 2 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
              🔥 {streak}
            </span>
          )}
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-8 text-center transition-all duration-200 shadow-sm"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--bd)',
          outline: isResult
            ? `2px solid ${isTimeout ? '#f59e0b' : isCorrect ? 'var(--green)' : 'var(--red)'}`
            : '2px solid transparent',
        }}>
        <p className="text-5xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--t-strong)' }}>
          {question?.symbol}
        </p>
        <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded"
          style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}>
          {question?.exchange}
        </span>
        {isResult && (
          <p className="mt-4 text-sm font-semibold"
            style={{ color: isTimeout ? '#f59e0b' : isCorrect ? 'var(--green)' : 'var(--red)' }}>
            {isTimeout ? '⏰ Hết giờ!' : isCorrect ? '✓ Chính xác!' : '✗ Sai rồi!'}
          </p>
        )}
      </div>

      <div className="flex gap-4 w-full max-w-sm">
        {[
          { choice: 'bull', label: 'Bull ▲', Icon: TrendingUp,  color: 'var(--green-strong)', tint: 'var(--tint-green)', border: 'var(--green)' },
          { choice: 'bear', label: 'Bear ▼', Icon: TrendingDown, color: 'var(--red-strong)',   tint: 'var(--tint-red)',   border: 'var(--red)'   },
        ].map(({ choice, label, Icon, color, tint, border }) => (
          <button key={choice}
            onClick={() => handleAnswer(choice)}
            disabled={isResult}
            className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            style={{
              background: isResult && answerRef.current === choice ? tint : 'var(--card)',
              border: `2px solid ${isResult && answerRef.current === choice ? border : 'var(--bd)'}`,
              color,
            }}>
            <Icon size={28} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
