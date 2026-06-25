require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const kisService      = require('../services/kisService');
const vndirectService = require('../services/vndirectService');
const tcbsService     = require('../services/tcbsService');

const TODAY = new Date().toISOString().split('T')[0];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB connected\n');

  // --- KIS ---
  console.log('=== KIS ===');
  try {
    const result = await kisService.syncPrices(TODAY);
    console.log('KIS sync:', result);
  } catch (e) {
    console.error('KIS error:', e.message);
  }

  // --- VNDirect ---
  console.log('\n=== VNDirect ===');
  try {
    const result = await vndirectService.syncPrices(TODAY);
    console.log('VNDirect sync:', result);
  } catch (e) {
    console.error('VNDirect error:', e.message);
  }

  // --- TCBS (test với 5 mã) ---
  console.log('\n=== TCBS (5 mã test) ===');
  try {
    const result = await tcbsService.syncPrices(TODAY, ['ACB', 'VCB', 'VNM', 'HPG', 'FPT']);
    console.log('TCBS sync:', result);
  } catch (e) {
    console.error('TCBS error:', e.message);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run();
