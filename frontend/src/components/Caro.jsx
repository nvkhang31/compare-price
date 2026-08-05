import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Flag, RotateCcw, Copy, Check, WifiOff } from 'lucide-react'
import { io } from 'socket.io-client'

const ROWS = 20, COLS = 20
// Local: empty string → Vite proxies /socket.io → localhost:5000
// Production: set VITE_SOCKET_URL to backend URL (e.g. https://compare-price-lel6.onrender.com)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

export default function Caro({ onBack }) {
  const [phase,          setPhase]          = useState('idle')
  const [nickname,       setNickname]       = useState('')
  const [joinCode,       setJoinCode]       = useState('')
  const [roomCode,       setRoomCode]       = useState('')
  const [myRole,         setMyRole]         = useState(null)     // 'X' | 'O'
  const [opponentName,   setOpponentName]   = useState('')
  const [board,          setBoard]          = useState(createBoard)
  const [turn,           setTurn]           = useState('X')
  const [winner,         setWinner]         = useState(null)
  const [winCells,       setWinCells]       = useState([])
  const [lastMove,       setLastMove]       = useState(null)
  const [scores,         setScores]         = useState({ X: 0, O: 0 })
  const [error,          setError]          = useState('')
  const [copied,         setCopied]         = useState(false)
  const [countdown,      setCountdown]      = useState(null)
  const [opponentRematch,setOpponentRematch]= useState(false)
  const [myRematch,      setMyRematch]      = useState(false)
  const [gameOverReason, setGameOverReason] = useState(null)
  const [zoom,           setZoom]           = useState(1)
  const [pendingCell,    setPendingCell]    = useState(null)

  const socketRef          = useRef(null)
  const countdownTimer     = useRef(null)
  const nicknameRef        = useRef('')
  const lastPointerTypeRef = useRef('mouse')

  // Keep ref in sync so socket handlers always read latest value
  useEffect(() => { nicknameRef.current = nickname }, [nickname])

  // Clear pending preview when turn changes or game ends
  useEffect(() => { setPendingCell(null) }, [turn, phase])

  // ── Socket lifecycle ────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('room-created', ({ code }) => {
      setRoomCode(code)
      setPhase('waiting')
      localStorage.setItem('caro_session', JSON.stringify({ code, role: 'X', nickname: nicknameRef.current }))
    })

    socket.on('game-start', ({ role, opponentNickname, code }) => {
      setMyRole(role)
      setOpponentName(opponentNickname)
      setRoomCode(code)
      setBoard(createBoard())
      setTurn('X')
      setWinner(null)
      setWinCells([])
      setLastMove(null)
      setGameOverReason(null)
      clearInterval(countdownTimer.current)
      setCountdown(null)
      setPhase('playing')
      localStorage.setItem('caro_session', JSON.stringify({ code, role, nickname: nicknameRef.current }))
    })

    socket.on('stone-placed', ({ r, c, player, turn: nextTurn }) => {
      setBoard(prev => {
        const next = prev.map(row => [...row])
        next[r][c] = player
        return next
      })
      setLastMove({ r, c })
      setTurn(nextTurn)
    })

    socket.on('game-over', ({ winner: w, winCells: wc, reason, scores: sc }) => {
      setWinner(w)
      setWinCells(wc || [])
      setGameOverReason(reason)
      if (sc) setScores(sc)
      setPhase(wc?.length > 0 ? 'won-pending' : 'won')
    })

    socket.on('draw', ({ scores: sc }) => {
      if (sc) setScores(sc)
      setPhase('draw')
    })

    socket.on('opponent-disconnected', ({ timeLeft }) => {
      clearInterval(countdownTimer.current)
      setCountdown(timeLeft)
      countdownTimer.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(countdownTimer.current); return 0 }
          return c - 1
        })
      }, 1000)
    })

    socket.on('opponent-reconnected', () => {
      clearInterval(countdownTimer.current)
      setCountdown(null)
    })

    socket.on('rematch-requested', () => setOpponentRematch(true))

    socket.on('rematch-start', () => {
      setBoard(createBoard())
      setTurn('X')
      setWinner(null)
      setWinCells([])
      setLastMove(null)
      setGameOverReason(null)
      setOpponentRematch(false)
      setMyRematch(false)
      clearInterval(countdownTimer.current)
      setCountdown(null)
      setPhase('playing')
    })

    socket.on('join-error',   ({ message }) => setError(message))
    socket.on('rejoin-error', () => { localStorage.removeItem('caro_session') })

    socket.on('rejoin-success', ({ role, code, board: b, turn: t, phase: p, scores: sc, opponentNickname }) => {
      setMyRole(role)
      setRoomCode(code)
      setOpponentName(opponentNickname)
      setBoard(b)
      setTurn(t)
      if (sc) setScores(sc)
      if (p === 'playing') setPhase('playing')
      else if (p === 'waiting') setPhase('waiting')
    })

    socket.on('room-closed', ({ reason }) => {
      clearInterval(countdownTimer.current)
      setCountdown(null)
      setError(reason)
      setPhase('idle')
      localStorage.removeItem('caro_session')
    })

    socket.on('connect_error', () => {
      setError('Không thể kết nối server. Vui lòng thử lại sau.')
    })

    socket.connect()

    // Try rejoin saved session on connect
    const saved = localStorage.getItem('caro_session')
    if (saved) {
      try {
        const session = JSON.parse(saved)
        setNickname(session.nickname || '')
        nicknameRef.current = session.nickname || ''
        const tryRejoin = () => socket.emit('rejoin-room', session)
        if (socket.connected) tryRejoin()
        else socket.once('connect', tryRejoin)
      } catch {
        localStorage.removeItem('caro_session')
      }
    }

    return () => {
      socket.emit('leave-room')
      socket.disconnect()
      clearInterval(countdownTimer.current)
      localStorage.removeItem('caro_session')
    }
  }, [])

  // Won-pending → won after animation
  useEffect(() => {
    if (phase !== 'won-pending') return
    const t = setTimeout(() => setPhase('won'), 950)
    return () => clearTimeout(t)
  }, [phase])

  // ── Actions ──────────────────────────────────────────────────
  function createRoom() {
    const nick = nickname.trim()
    if (!nick) return
    setError('')
    socketRef.current?.emit('create-room', { nickname: nick })
  }

  function joinRoom() {
    const nick = nickname.trim()
    const code = joinCode.trim().toUpperCase()
    if (!nick || code.length < 6) return
    setError('')
    socketRef.current?.emit('join-room', { code, nickname: nick })
  }

  function handleCellClick(r, c) {
    if (phase !== 'playing' || turn !== myRole) return
    if (board[r][c] !== null) { setPendingCell(null); return }

    if (lastPointerTypeRef.current === 'touch') {
      // Two-tap on mobile: first tap previews, second tap places
      if (pendingCell?.r === r && pendingCell?.c === c) {
        setPendingCell(null)
        socketRef.current?.emit('place-stone', { r, c })
      } else {
        setPendingCell({ r, c })
      }
    } else {
      socketRef.current?.emit('place-stone', { r, c })
    }
  }

  function surrender() {
    socketRef.current?.emit('surrender')
  }

  function requestRematch() {
    setMyRematch(true)
    socketRef.current?.emit('request-rematch')
  }

  function leaveRoom() {
    socketRef.current?.emit('leave-room')
    localStorage.removeItem('caro_session')
    clearInterval(countdownTimer.current)
    setCountdown(null)
    setPhase('idle')
    setBoard(createBoard())
    setTurn('X')
    setWinner(null)
    setWinCells([])
    setLastMove(null)
    setScores({ X: 0, O: 0 })
    setMyRole(null)
    setOpponentName('')
    setRoomCode('')
    setJoinCode('')
    setOpponentRematch(false)
    setMyRematch(false)
    setGameOverReason(null)
    setError('')
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Derived ──────────────────────────────────────────────────
  const nameX  = myRole === 'X' ? (nickname.trim() || 'Bạn') : opponentName
  const nameO  = myRole === 'O' ? (nickname.trim() || 'Bạn') : opponentName
  const names  = { X: nameX, O: nameO }
  const winSet = new Set(winCells.map(w => `${w.r},${w.c}`))
  const myTurn = phase === 'playing' && turn === myRole

  // ── Shared back button ────────────────────────────────────────
  const backBtn = (
    <button onClick={onBack}
      className="self-start inline-flex items-center gap-1.5 text-sm font-medium"
      style={{ color: 'var(--t-mid)' }}
      onMouseOver={e => e.currentTarget.style.color = 'var(--t-strong)'}
      onMouseOut={e  => e.currentTarget.style.color = 'var(--t-mid)'}>
      <ArrowLeft size={14} /> Games
    </button>
  )

  // ── IDLE ─────────────────────────────────────────────────────
  if (phase === 'idle') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      {backBtn}

      <div className="text-center -mt-2">
        <div className="flex justify-center mb-4">
          <div className="game-logo-ring game-logo-ring--caro">
            <div className="game-logo-ring-inner">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <line x1="11" y1="1"  x2="11" y2="31" stroke="#c084fc" strokeWidth="1"   opacity="0.45"/>
                <line x1="21" y1="1"  x2="21" y2="31" stroke="#c084fc" strokeWidth="1"   opacity="0.45"/>
                <line x1="1"  y1="11" x2="31" y2="11" stroke="#c084fc" strokeWidth="1"   opacity="0.45"/>
                <line x1="1"  y1="21" x2="31" y2="21" stroke="#c084fc" strokeWidth="1"   opacity="0.45"/>
                <line x1="4"  y1="4"  x2="8"  y2="8"  stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="8"  y1="4"  x2="4"  y2="8"  stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round"/>
                <circle cx="16" cy="16" r="3.5" stroke="#fca5a5" strokeWidth="2" fill="none"/>
                <line x1="24" y1="24" x2="28" y2="28" stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="28" y1="24" x2="24" y2="28" stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--t-strong)' }}>Caro Online</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-mid)' }}>Nối 5 ô liên tiếp để chiến thắng — 20×20</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: 'var(--t-mid)' }}>Tên của bạn</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nickname.trim() && createRoom()}
            placeholder="Nhập tên hiển thị..."
            maxLength={20}
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--card)', border: '2px solid rgba(168,85,247,0.35)', color: 'var(--t-strong)' }}
          />
        </div>

        {error && (
          <p className="text-xs text-center px-3 py-2 rounded-lg"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={createRoom}
            disabled={!nickname.trim()}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            Tạo phòng
          </button>
          <button
            onClick={() => { setError(''); setPhase('joining') }}
            disabled={!nickname.trim()}
            className="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-40"
            style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
            Vào phòng
          </button>
        </div>
      </div>
    </div>
  )

  // ── JOINING ──────────────────────────────────────────────────
  if (phase === 'joining') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      {backBtn}

      <div className="text-center -mt-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--t-strong)' }}>Vào phòng</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-mid)' }}>Nhập mã phòng từ bạn của bạn</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <input
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && joinCode.length === 6 && joinRoom()}
          placeholder="XXXXXX"
          maxLength={6}
          autoFocus
          className="w-full px-4 py-4 rounded-xl text-2xl font-black text-center outline-none uppercase"
          style={{
            background:    'var(--card)',
            border:        '2px solid rgba(168,85,247,0.4)',
            color:         'var(--t-strong)',
            letterSpacing: '0.32em'
          }}
        />

        {error && (
          <p className="text-xs text-center px-3 py-2 rounded-lg"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
            {error}
          </p>
        )}

        <button
          onClick={joinRoom}
          disabled={joinCode.length < 6}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
          Vào phòng
        </button>
        <button
          onClick={() => { setPhase('idle'); setError(''); setJoinCode('') }}
          className="w-full py-2.5 rounded-xl font-bold text-sm"
          style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
          Quay lại
        </button>
      </div>
    </div>
  )

  // ── WAITING ──────────────────────────────────────────────────
  if (phase === 'waiting') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-7">
      {backBtn}

      <div className="text-center -mt-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--t-strong)' }}>Phòng đã tạo</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-mid)' }}>Chia sẻ mã phòng cho đối thủ của bạn</p>
      </div>

      {/* Code card */}
      <div className="px-8 py-6 rounded-2xl flex flex-col items-center gap-3 w-full max-w-xs"
        style={{ background: 'var(--card)', border: '1px solid rgba(168,85,247,0.3)' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#a855f7' }}>Mã phòng</p>
        <p className="text-4xl font-black" style={{ color: 'var(--t-strong)', letterSpacing: '0.28em' }}>
          {roomCode}
        </p>
        <button
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all"
          style={{
            background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.1)',
            color:      copied ? '#22c55e' : '#a855f7',
            border:     `1px solid ${copied ? 'rgba(34,197,94,0.28)' : 'rgba(168,85,247,0.28)'}`
          }}>
          {copied ? <><Check size={11}/> Đã copy!</> : <><Copy size={11}/> Copy mã</>}
        </button>
      </div>

      {/* Waiting indicator */}
      <div className="flex items-center gap-2.5" style={{ color: 'var(--t-faint)' }}>
        <div className="flex gap-1">
          {[0, 0.15, 0.3].map((d, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: '#a855f7', opacity: 0.7, animationDelay: `${d}s` }} />
          ))}
        </div>
        <span className="text-sm">Đang chờ đối thủ kết nối</span>
      </div>

      <button onClick={leaveRoom}
        className="px-6 py-2.5 rounded-xl font-bold text-sm"
        style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
        Hủy phòng
      </button>
    </div>
  )

  // ── WON / DRAW ───────────────────────────────────────────────
  if (phase === 'won' || phase === 'draw') {
    const isDraw = phase === 'draw'
    const iWon   = winner === myRole

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        {backBtn}

        <div className="text-center space-y-1.5 -mt-2">
          <p className="text-4xl">{isDraw ? '🤝' : iWon ? '🏆' : '😔'}</p>
          <h2 className="text-xl font-bold" style={{ color: 'var(--t-strong)' }}>
            {isDraw ? 'Hòa!' : iWon ? 'Bạn thắng!' : `${opponentName} thắng!`}
          </h2>
          <p className="text-sm" style={{ color: 'var(--t-faint)' }}>
            {gameOverReason === 'surrender'   && (iWon ? 'Đối thủ đã đầu hàng' : 'Bạn đã đầu hàng')}
            {gameOverReason === 'disconnect'  && 'Đối thủ mất kết nối'}
            {gameOverReason === 'win'         && (iWon ? 'Nối được 5 ô liên tiếp!' : 'Đối thủ nối được 5 ô liên tiếp')}
          </p>
        </div>

        {/* Score board */}
        <div className="flex items-center gap-5 px-7 py-4 rounded-2xl"
          style={{ background: 'var(--card)', border: '1px solid var(--bd)' }}>
          <div className="text-center">
            <p className="text-xs font-semibold truncate max-w-[72px]" style={{ color: '#3b82f6' }}>{nameX}</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: '#3b82f6' }}>{scores.X}</p>
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--t-faint)' }}>VS</p>
          <div className="text-center">
            <p className="text-xs font-semibold truncate max-w-[72px]" style={{ color: '#ef4444' }}>{nameO}</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: '#ef4444' }}>{scores.O}</p>
          </div>
        </div>

        {/* Rematch actions */}
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          {opponentRematch && !myRematch && (
            <p className="text-xs font-semibold" style={{ color: '#a855f7' }}>
              🔄 {opponentName} muốn chơi lại!
            </p>
          )}
          <div className="flex gap-3 w-full">
            <button
              onClick={requestRematch}
              disabled={myRematch}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-55"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
              <RotateCcw size={13} />
              {myRematch ? 'Đang chờ...' : 'Chơi lại'}
            </button>
            <button
              onClick={leaveRoom}
              className="flex-1 inline-flex items-center justify-center py-2.5 rounded-xl font-bold text-sm"
              style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
              Rời phòng
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAYING (+ won-pending — board stays visible) ─────────────
  return (
    <div className="flex flex-col items-center gap-3 select-none">

      {/* Turn indicator */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: 580 }}>

        {/* X player */}
        <div className="flex items-center gap-2"
          style={{ opacity: turn === 'X' ? 1 : 0.38, transition: 'opacity 0.2s' }}>
          <div className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: '#3b82f6', boxShadow: turn === 'X' ? '0 0 8px #3b82f6' : 'none' }} />
          <div>
            <p className="text-sm font-bold leading-tight truncate max-w-[100px]" style={{ color: 'var(--t-strong)' }}>
              {nameX}
              {myRole === 'X' && (
                <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--t-faint)' }}>(bạn)</span>
              )}
            </p>
            <p className="text-[10px] font-semibold" style={{ color: '#3b82f6' }}>{scores.X} thắng</p>
          </div>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t-faint)' }}>
            {myTurn ? 'Lượt của bạn' : 'Chờ đối thủ'}
          </span>
          <span className="text-xs font-black" style={{ color: turn === 'X' ? '#3b82f6' : '#ef4444' }}>
            {names[turn] || '?'}
          </span>
        </div>

        {/* O player */}
        <div className="flex items-center gap-2 flex-row-reverse"
          style={{ opacity: turn === 'O' ? 1 : 0.38, transition: 'opacity 0.2s' }}>
          <div className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: '#ef4444', boxShadow: turn === 'O' ? '0 0 8px #ef4444' : 'none' }} />
          <div className="text-right">
            <p className="text-sm font-bold leading-tight truncate max-w-[100px]" style={{ color: 'var(--t-strong)' }}>
              {nameO}
              {myRole === 'O' && (
                <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--t-faint)' }}>(bạn)</span>
              )}
            </p>
            <p className="text-[10px] font-semibold" style={{ color: '#ef4444' }}>{scores.O} thắng</p>
          </div>
        </div>

      </div>

      {/* Disconnect countdown toast */}
      {countdown !== null && countdown > 0 && (
        <div className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', maxWidth: 580 }}>
          <WifiOff size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
            Đối thủ mất kết nối — tự động thắng sau <strong>{countdown}s</strong>
          </span>
        </div>
      )}

      {/* Board — scrollable when zoomed */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div className="caro-board-wrap"
          style={{ width: Math.min(580, window.innerWidth - 16) * zoom }}>
          <div className="caro-board" data-turn={myTurn ? turn : ''}>
            {board.map((row, r) =>
              row.map((stone, c) => {
                const key       = `${r}-${c}`
                const isWin     = winSet.has(`${r},${c}`)
                const isLast    = lastMove?.r === r && lastMove?.c === c
                const isPending = myTurn && !stone && pendingCell?.r === r && pendingCell?.c === c
                return (
                  <div
                    key={key}
                    className={`caro-cell${stone ? ' caro-cell--occupied' : ''}`}
                    onPointerDown={(e) => { lastPointerTypeRef.current = e.pointerType }}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {isPending && (
                      <div className={`caro-stone caro-stone--${turn} caro-stone--preview`} />
                    )}
                    {stone && (
                      <div className={[
                        'caro-stone',
                        `caro-stone--${stone}`,
                        isWin  ? 'caro-stone--win'  : '',
                        isLast ? 'caro-stone--last' : '',
                      ].join(' ')} />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {winCells.length > 0 && (() => {
            const sorted = [...winCells].sort((a, b) => a.r !== b.r ? a.r - b.r : a.c - b.c)
            const first  = sorted[0], last = sorted[sorted.length - 1]
            return (
              <svg className="caro-win-line" viewBox={`0 0 ${COLS} ${ROWS}`}>
                <line
                  x1={first.c + 0.5} y1={first.r + 0.5}
                  x2={last.c  + 0.5} y2={last.r  + 0.5}
                  stroke="#fbbf24" strokeWidth="0.38"
                  strokeLinecap="round"
                  pathLength="1"
                  className="caro-win-line-path"
                />
              </svg>
            )
          })()}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setZoom(z => Math.max(0.5, Math.round((z - 0.25) * 4) / 4))}
          disabled={zoom <= 0.5}
          className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center disabled:opacity-30 select-none"
          style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
          −
        </button>
        <span className="text-xs font-mono w-10 text-center" style={{ color: 'var(--t-faint)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(2.5, Math.round((z + 0.25) * 4) / 4))}
          disabled={zoom >= 2.5}
          className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center disabled:opacity-30 select-none"
          style={{ background: 'var(--card)', border: '1px solid var(--bd)', color: 'var(--t-mid)' }}>
          +
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={leaveRoom}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--t-mid)', background: 'var(--card)', border: '1px solid var(--bd)' }}>
          <ArrowLeft size={13} /> Rời phòng
        </button>
        {phase === 'playing' && (
          <button onClick={surrender}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Flag size={13} /> Đầu hàng
          </button>
        )}
      </div>

    </div>
  )
}
