const axios  = require('axios');
const Config = require('../models/Config');

// Fallback — matches SSI VN30 as of 2026-07 (BSR replaced DGC after HOSE semi-annual review)
const FALLBACK_VN30 = [
  'ACB','BID','BSR','CTG','FPT','GAS','GVR','HDB','HPG','LPB',
  'MBB','MSN','MWG','PLX','SAB','SHB','SSB','SSI','STB','TCB',
  'TPB','VCB','VHM','VIB','VIC','VJC','VNM','VPB','VPL','VRE'
];

// SSI iboard public API — confirmed working, no auth required
// Source: Saigon Securities Inc. (official HOSE/HNX licensed data distributor)
async function fetchVN30FromSSI() {
  const response = await axios.get(
    'https://iboard-query.ssi.com.vn/stock/group/VN30',
    {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    'https://iboard.ssi.com.vn/',
        'Origin':     'https://iboard.ssi.com.vn',
        'Accept':     'application/json'
      }
    }
  );

  const data    = response.data?.data || [];
  const symbols = data
    .filter(item => item?.stockSymbol)
    .map(item => item.stockSymbol.toUpperCase());

  return symbols.length >= 25 ? symbols : null;
}

async function refreshVN30() {
  let symbols = null;
  let source  = 'fallback';

  try {
    symbols = await fetchVN30FromSSI();
    if (symbols) source = 'ssi';
  } catch (e) {
    console.warn(`[IndexService] SSI VN30 fetch failed: ${e.message}`);
  }

  if (!symbols) {
    symbols = FALLBACK_VN30;
  }

  await Config.findOneAndUpdate(
    { key: 'vn30_symbols' },
    { key: 'vn30_symbols', value: symbols, updatedAt: new Date() },
    { upsert: true }
  );

  console.log(`[IndexService] VN30 refreshed (${source}): ${symbols.length} symbols — ${symbols.join(', ')}`);
  return symbols;
}

async function getVN30Symbols() {
  const config = await Config.findOne({ key: 'vn30_symbols' });
  return config?.value?.length >= 25 ? config.value : FALLBACK_VN30;
}

module.exports = { refreshVN30, getVN30Symbols, FALLBACK_VN30 };
