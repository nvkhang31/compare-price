const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  nickname:   { type: String, required: true, trim: true, maxlength: 30 },
  time:       { type: Number, required: true },   // seconds
  difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
  createdAt:  { type: Date, default: Date.now }
})

schema.index({ difficulty: 1, time: 1 })

module.exports = mongoose.model('SudokuScore', schema)
