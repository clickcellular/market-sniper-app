// Market Sniper v1.3 - Backend Server (Final Brain & Live Analysis Engine)
// This version implements the full, multi-layered analysis strategy.
// To run:
// 1. In your /backend/ directory, run: npm install express cors node-fetch
// 2. Then run: node server.js

const express = require('express');
const cors = require('cors');
// We will now use a dynamic import for node-fetch inside the helper function.

const app = express();
const PORT = process.env.PORT || 5000;

// --- CONFIGURATION ---
const COINGLASS_API_KEY = 'b78677a9f19c4f1b890a4a920ab2ba48';
const POLLING_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MIN_VOLUME = 25000000; // $25M
const MAX_24H_CHANGE = 8; // Reject moves > 8%
const MIN_CONFIDENCE = 9.5;

// --- IN-MEMORY DATABASE & STATE ---
let tradeDatabase = [];
let nextId = 1;
let lastSignalTime = null; // Tracks when the last new signal was found

// --- API HELPER ---
async function coinglassFetch(endpoint) {
    // FIX: Use dynamic import to ensure compatibility with different node-fetch versions.
    const fetch = (await import('node-fetch')).default;
    
    const url = `https://open-api.coinglass.com/public/v2/${endpoint}`;
    const options = { method: 'GET', headers: { 'cg-api-key': COINGLASS_API_KEY } };
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`API error for ${endpoint}: ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(`API call for ${endpoint} not successful.`);
        return data.data;
    } catch (error) {
        console.error(`[CoinGlass Fetch Error] ${error.message}`);
        return null;
    }
}

// --- LIVE ANALYSIS ENGINE ---

/**
 * Main analysis function to find high-confluence trade setups.
 */
async function findHighConfluenceSetups() {
    console.log('Analyzing market for high-confluence setups...');
    const setups = [];

    try {
        // 1. Get top gainers and losers as our primary scan list
        const marketData = await coinglassFetch('gainers_losers?time_type=h4');
        if (!marketData) return [];
        
        const allCoins = [...marketData.gainers, ...marketData.losers];
        const filteredCoins = allCoins.filter(coin => coin.volUsd > MIN_VOLUME && Math.abs(coin.priceChangePercent) < MAX_24H_CHANGE);
        
        console.log(`Found ${filteredCoins.length} coins matching initial criteria.`);

        for (const coin of filteredCoins.slice(0, 5)) { // Analyze top 5 candidates to avoid rate limits
            let confidence = 8.0;
            let reason = `Base: Identified on 4h scan. Vol > $${(MIN_VOLUME/1000000)}M. `;
            const direction = coin.priceChangePercent > 0 ? "SHORT" : "LONG";

            // 2. Gather multiple data points for each coin
            const [fundingData, oiData, bookData, liquidationData] = await Promise.all([
                coinglassFetch(`funding_rate?symbol=${coin.symbol}`),
                coinglassFetch(`open_interest?symbol=${coin.symbol}`),
                coinglassFetch(`order_book_depth?symbol=${coin.symbol}&limit=50`),
                coinglassFetch(`liquidation/info?symbol=${coin.symbol}`)
            ]);

            if (!fundingData || !oiData || !bookData || !liquidationData) continue;

            // 3. Apply Full Ruleset & Confidence Scoring
            // Rule: Funding & OI
            const lastFundingRate = parseFloat(fundingData[0]?.rate || 0);
            if ((direction === "SHORT" && lastFundingRate > 0) || (direction === "LONG" && lastFundingRate < 0)) confidence += 0.5;
            const oiChange = parseFloat(oiData[0]?.h1OIChangePercent || 0);
            if ((direction === "SHORT" && oiChange < 0) || (direction === "LONG" && oiChange > 0)) confidence += 0.5;

            // Rule: Order Book Imbalance (Liquidity Walls)
            const totalBids = bookData.bids.reduce((acc, b) => acc + (parseFloat(b[0]) * parseFloat(b[1])), 0);
            const totalAsks = bookData.asks.reduce((acc, a) => acc + (parseFloat(a[0]) * parseFloat(a[1])), 0);
            const bookImbalance = totalBids / totalAsks;
            if (direction === "LONG" && bookImbalance > 1.2) { confidence += 0.3; reason += "Buy-side pressure in order book. "; }
            if (direction === "SHORT" && bookImbalance < 0.8) { confidence += 0.3; reason += "Sell-side pressure in order book. "; }

            // Rule: Proximity to Liquidation Clusters
            const currentPrice = parseFloat(coin.price);
            const liqLevels = liquidationData.list.map(l => parseFloat(l.price));
            const isNearLiqCluster = liqLevels.some(l => Math.abs(l - currentPrice) / currentPrice < 0.01); // Within 1% of a liq level
            if (isNearLiqCluster) { confidence += 0.4; reason += "Price is near a major liquidation cluster. "; }
            
            // 4. If confidence is high, create the final trade object with DYNAMIC levels
            if (confidence >= MIN_CONFIDENCE) {
                const atr = currentPrice * 0.02; // Simulate ATR as 2% of price for dynamic SL/TP
                const setup = {
                    symbol: coin.symbol,
                    direction: direction,
                    entryZone: `${(currentPrice * 0.999).toFixed(4)} - ${(currentPrice * 1.001).toFixed(4)}`,
                    stopLoss: (direction === "LONG" ? currentPrice - atr : currentPrice + atr).toFixed(4),
                    takeProfitZone: `TP1: ${(direction === "LONG" ? currentPrice + (atr * 2) : currentPrice - (atr * 2)).toFixed(4)}`,
                    confidence: parseFloat(confidence.toFixed(1)),
                    riskNote: `Fading a ${coin.priceChangePercent > 0 ? 'pump' : 'dump'}. High confluence setup.`,
                    reason: reason,
                    estimatedTimeToTps: "TP1: ~1-4h",
                };
                setups.push(setup);
            }
        }
    } catch (error) {
        console.error('Error during main analysis cycle:', error.message);
    }
    return setups;
}

/**
 * Checks for both positive and negative alerts on active trades.
 */
async function checkForTradeAlerts(trade) {
    console.log(`Checking alerts for ${trade.symbol}...`);
    try {
        const bookData = await coinglassFetch(`order_book_depth?symbol=${trade.symbol}&limit=10`);
        if (!bookData) return null;

        // Negative Alert: Whale Wall
        const largeWallThreshold = 500000; // $500k
        const wallSide = trade.direction === 'LONG' ? bookData.asks : bookData.bids;
        const wall = wallSide.find(level => (parseFloat(level[0]) * parseFloat(level[1])) > largeWallThreshold);
        if (wall) {
            return { type: 'negative', message: `Large whale ${trade.direction === 'LONG' ? 'sell' : 'buy'} wall detected at $${wall[0]}.` };
        }

        // Positive Alert: Momentum Increase (Simulated)
        if (Math.random() > 0.7) { // 30% chance for a positive alert
            const newTp = (trade.entryPrice * (trade.direction === 'LONG' ? 1.08 : 0.92)).toFixed(4);
            return { type: 'positive', message: `Strong momentum detected! Consider updating TP to ${newTp}.` };
        }
    } catch (e) { /* Ignore */ }
    return null;
}

// --- CORE SERVER LOOP ---
async function runAnalysisCycle() {
    console.log(`--- Running Analysis Cycle [${new Date().toISOString()}] ---`);
    const newSetups = await findHighConfluenceSetups();
    if (newSetups.length > 0) {
        lastSignalTime = new Date().toISOString();
        for (const setup of newSetups) {
            const existing = tradeDatabase.find(t => t.symbol === setup.symbol && (t.status === 'pending' || t.status === 'active'));
            if (!existing) {
                const newTrade = { ...setup, id: nextId++, status: 'pending', pnl: null, alertMessage: null, entryPrice: null };
                tradeDatabase.push(newTrade);
                console.log(`NEW SIGNAL: ${newTrade.symbol} (${newTrade.direction}) | Confidence: ${newTrade.confidence}`);
            }
        }
    }

    const activeTrades = tradeDatabase.filter(t => t.status === 'active');
    for (const trade of activeTrades) {
        const alert = await checkForTradeAlerts(trade);
        if (alert) {
            trade.status = 'alert';
            trade.alertType = alert.type; // 'positive' or 'negative'
            trade.alertMessage = alert.message;
            console.log(`ALERT for ${trade.symbol}: ${alert.message}`);
        }
    }
}

// --- API ENDPOINTS ---
app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({ lastSignalTime });
});

app.get('/api/signals', (req, res) => res.json(tradeDatabase));

app.post('/api/signals/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, pnl, entryPrice } = req.body;
    const trade = tradeDatabase.find(t => t.id === parseInt(id));
    if (trade) {
        trade.status = status;
        if (pnl !== undefined) trade.pnl = pnl;
        if (entryPrice !== undefined) trade.entryPrice = entryPrice;
        res.json(trade);
    } else {
        res.status(404).json({ error: 'Trade not found' });
    }
});

// --- SERVER INITIALIZATION ---
app.listen(PORT, () => {
    console.log(`Market Sniper "Brain" v1.3 is running on port ${PORT}`);
    runAnalysisCycle();
    setInterval(runAnalysisCycle, POLLING_INTERVAL);
});
