const express = require('express')
const router  = express.Router()
const SudokuScore = require('../models/SudokuScore')

const VALID_DIFF = ['easy', 'medium', 'hard']

// POST /api/game/sudoku/score
router.post('/score', async (req, res) => {
  try {
    const { nickname, time, difficulty } = req.body
    if (!nickname?.trim() || typeof time !== 'number' || time <= 0 || !VALID_DIFF.includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    const n = nickname.trim().slice(0, 30)

    // Keep only personal best per nickname + difficulty
    const existing = await SudokuScore.findOne({ nickname: n, difficulty })
    if (!existing) {
      await SudokuScore.create({ nickname: n, time, difficulty })
    } else if (time < existing.time) {
      existing.time      = time
      existing.createdAt = new Date()
      await existing.save()
    }

    // Rank = how many unique best-times are faster than this submission + 1
    const rank = await SudokuScore.countDocuments({ difficulty, time: { $lt: time } }) + 1

    res.json({ ok: true, rank })
  } catch (e) {
    console.error('[sudoku/score]', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/game/sudoku/leaderboard?difficulty=easy
router.get('/leaderboard', async (req, res) => {
  try {
    const { difficulty = 'easy' } = req.query
    if (!VALID_DIFF.includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty' })
    }

    const scores = await SudokuScore
      .find({ difficulty })
      .sort({ time: 1 })
      .limit(10)
      .select('nickname time createdAt -_id')

    res.json(scores)
  } catch (e) {
    console.error('[sudoku/leaderboard]', e)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
