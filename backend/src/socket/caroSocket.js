const ROWS = 20, COLS = 20, WIN_LEN = 5
const DIRS = [[0,1],[1,0],[1,1],[1,-1]]
const DISCONNECT_MS = 30_000
const IDLE_MS       = 10 * 60_000   // auto-delete empty room after 10 min

const rooms = new Map()

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function checkWin(board, r, c, player) {
  for (const [dr, dc] of DIRS) {
    const cells = [{ r, c }]
    for (let i = 1; i < WIN_LEN; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== player) break
      cells.push({ r: nr, c: nc })
    }
    for (let i = 1; i < WIN_LEN; i++) {
      const nr = r - dr * i, nc = c - dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== player) break
      cells.push({ r: nr, c: nc })
    }
    if (cells.length >= WIN_LEN) return cells
  }
  return null
}

function deleteRoom(code) {
  const room = rooms.get(code)
  if (!room) return
  clearTimeout(room.disconnectTimers.X)
  clearTimeout(room.disconnectTimers.O)
  clearTimeout(room.idleTimer)
  rooms.delete(code)
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    let myCode = null
    let myRole = null

    // ── Helpers ─────────────────────────────────────────────
    function opRole()     { return myRole === 'X' ? 'O' : 'X' }
    function opSocketId() {
      const room = rooms.get(myCode)
      return room?.players[opRole()]?.socketId
    }

    function closeRoom(reason) {
      const opId = opSocketId()
      if (opId) io.to(opId).emit('room-closed', { reason })
      deleteRoom(myCode)
      socket.leave(myCode)
      myCode = null
      myRole = null
    }

    // ── create-room ─────────────────────────────────────────
    socket.on('create-room', ({ nickname }) => {
      if (!nickname?.trim()) return
      let code, attempts = 0
      do { code = generateCode(); attempts++ } while (rooms.has(code) && attempts < 200)

      const room = {
        code,
        players: {
          X: { socketId: socket.id, nickname: nickname.trim().slice(0, 20) },
          O: null
        },
        board:            createBoard(),
        turn:             'X',
        phase:            'waiting',
        scores:           { X: 0, O: 0 },
        disconnectTimers: { X: null, O: null },
        rematchVotes:     new Set(),
        idleTimer:        setTimeout(() => deleteRoom(code), IDLE_MS)
      }
      rooms.set(code, room)
      socket.join(code)
      myCode = code
      myRole = 'X'
      socket.emit('room-created', { code })
    })

    // ── join-room ────────────────────────────────────────────
    socket.on('join-room', ({ code, nickname }) => {
      const upper = code?.trim().toUpperCase()
      const room  = rooms.get(upper)
      if (!room)            return socket.emit('join-error', { message: 'Phòng không tồn tại hoặc đã đóng' })
      if (room.players.O)   return socket.emit('join-error', { message: 'Phòng đã đủ 2 người chơi' })
      if (room.phase === 'ended') return socket.emit('join-error', { message: 'Phòng đã kết thúc' })

      clearTimeout(room.idleTimer)
      room.idleTimer = null

      room.players.O = { socketId: socket.id, nickname: nickname.trim().slice(0, 20) }
      room.phase     = 'playing'
      socket.join(upper)
      myCode = upper
      myRole = 'O'

      const xNick = room.players.X.nickname
      const oNick = room.players.O.nickname
      socket.emit('game-start', { role: 'O', opponentNickname: xNick, code: upper })
      io.to(room.players.X.socketId).emit('game-start', { role: 'X', opponentNickname: oNick, code: upper })
    })

    // ── rejoin-room (after page refresh / reconnect) ─────────
    socket.on('rejoin-room', ({ code, role, nickname }) => {
      const upper = code?.trim().toUpperCase()
      const room  = rooms.get(upper)
      if (!room)                                  return socket.emit('rejoin-error', { message: 'Phòng không còn tồn tại' })
      if (room.players[role]?.nickname !== nickname) return socket.emit('rejoin-error', { message: 'Không thể tái kết nối' })

      clearTimeout(room.disconnectTimers[role])
      room.disconnectTimers[role] = null
      room.players[role].socketId = socket.id
      socket.join(upper)
      myCode = upper
      myRole = role

      const op = role === 'X' ? 'O' : 'X'
      const opId = room.players[op]?.socketId
      if (opId) io.to(opId).emit('opponent-reconnected')

      socket.emit('rejoin-success', {
        role,
        code:             upper,
        board:            room.board,
        turn:             room.turn,
        phase:            room.phase,
        scores:           room.scores,
        opponentNickname: room.players[op]?.nickname || ''
      })
    })

    // ── place-stone ──────────────────────────────────────────
    socket.on('place-stone', ({ r, c }) => {
      if (!myCode || !myRole) return
      const room = rooms.get(myCode)
      if (!room || room.phase !== 'playing') return
      if (room.turn !== myRole)              return
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return
      if (room.board[r][c] !== null)         return

      room.board[r][c] = myRole
      const win = checkWin(room.board, r, c, myRole)

      if (win) {
        room.phase = 'ended'
        room.scores[myRole]++
        io.to(myCode).emit('game-over', {
          winner:   myRole,
          winCells: win,
          reason:   'win',
          scores:   room.scores
        })
      } else if (room.board.flat().every(v => v !== null)) {
        room.phase = 'ended'
        io.to(myCode).emit('draw', { scores: room.scores })
      } else {
        room.turn = myRole === 'X' ? 'O' : 'X'
        io.to(myCode).emit('stone-placed', { r, c, player: myRole, turn: room.turn })
      }
    })

    // ── surrender ────────────────────────────────────────────
    socket.on('surrender', () => {
      if (!myCode || !myRole) return
      const room = rooms.get(myCode)
      if (!room || room.phase !== 'playing') return
      const winner = opRole()
      room.phase = 'ended'
      room.scores[winner]++
      io.to(myCode).emit('game-over', { winner, winCells: [], reason: 'surrender', scores: room.scores })
    })

    // ── request-rematch ──────────────────────────────────────
    socket.on('request-rematch', () => {
      if (!myCode || !myRole) return
      const room = rooms.get(myCode)
      if (!room || room.phase !== 'ended') return
      room.rematchVotes.add(myRole)
      const opId = opSocketId()
      if (opId) io.to(opId).emit('rematch-requested')
      if (room.rematchVotes.size === 2) {
        room.board = createBoard()
        room.turn  = 'X'
        room.phase = 'playing'
        room.rematchVotes.clear()
        io.to(myCode).emit('rematch-start')
      }
    })

    // ── leave-room (explicit) ────────────────────────────────
    socket.on('leave-room', () => {
      if (!myCode) return
      closeRoom('Đối thủ đã rời phòng')
    })

    // ── disconnect ───────────────────────────────────────────
    socket.on('disconnect', () => {
      if (!myCode) return
      const room = rooms.get(myCode)
      if (!room) return

      const opId         = opSocketId()
      const capturedCode = myCode
      const capturedRole = myRole
      const opR          = opRole()

      if (room.phase === 'playing') {
        if (opId) io.to(opId).emit('opponent-disconnected', { timeLeft: 30 })
        room.disconnectTimers[capturedRole] = setTimeout(() => {
          const r = rooms.get(capturedCode)
          if (!r || r.phase !== 'playing') return
          r.phase = 'ended'
          r.scores[opR]++
          const currentOpId = r.players[opR]?.socketId
          if (currentOpId) {
            io.to(currentOpId).emit('game-over', {
              winner:   opR,
              winCells: [],
              reason:   'disconnect',
              scores:   r.scores
            })
          }
          deleteRoom(capturedCode)
        }, DISCONNECT_MS)
      } else {
        // waiting or ended — close room immediately
        if (opId) io.to(opId).emit('room-closed', { reason: 'Đối thủ đã ngắt kết nối' })
        deleteRoom(capturedCode)
      }
    })
  })
}
