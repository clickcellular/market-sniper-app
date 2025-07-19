// Market Sniper v1.1 - Backend Server (Live API Integration)
// This is the "Brain" of the application. It runs on a server 24/7.
// To run this:
// 1. Make sure you have Node.js installed.
// 2. In your /backend/ directory, run: npm install express cors node-fetch
// 3. Then run: node server.js

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Using node-fetch for API calls

const app = express();
const PORT = process.env.PORT || 5000;

// --- CONFIGURATION ---
const COINGLASS_API_KEY = 'b78677a9f19c4f1b890a4a920ab2ba48'; // Your API Key
const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MIN_VOLUME = 25000000; // Minimum $25M 24h volume

// --- IN-MEMORY DATABASE ---
// In a real production app, you would use a proper database like PostgreSQL, MongoDB, or Firestore.
let tradeDatabase = [];
let nextId = 1;

// --- LIVE API & ANALYSIS FUNCTIONS ---

/**
 * Fetches and analyzes gainer/loser data from CoinGlass to find new signals.
 * @returns {Promise<Array>} An array of potential trade setups.
 */
async function analyzeGainersAndLosers() {
    console.log('Analyzing Gainers & Losers from CoinGlass...');
    const url = 'https://open-api.coinglass.com/public/v2/gainers_losers?time_type=h1';
    const options = {
        method: 'GET',
        headers: { 'cg-api-key': COINGLASS_API_KEY }
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`CoinGlass API error! status: ${response.status}`);
        }
        const data = await response.json();

        if (!data.success || !data.data) {
            console.error('CoinGlass API did not return successful data.');
            return [];
        }

        const allCoins = [...data.data.gainers, ...data.data.losers];
        const filteredCoins = allCoins.filter(coin => coin.volUsd > MIN_VOLUME);

        console.log(`Found ${filteredCoins.length} coins with volume > $25M.`);

        // From the filtered list, apply more complex (simulated) rules to find a high-confidence setup
        if (filteredCoins.length > 0 && Math.random() > 0.5) { // 50% chance of a "high-confidence" signal
            const coin = filteredCoins[Math.floor(Math.random() * filteredCoins.length)];
            const direction = coin.priceChangePercent > 0 ? "SHORT" : "LONG"; // Fade the move
            const entryPrice = parseFloat(coin.price);
            
            // Simple logic to create a trade setup
            const setup = {
                symbol: coin.symbol,
                direction: direction,
                entryZone: `${(entryPrice * 0.998).toFixed(4)} - ${(entryPrice * 1.002).toFixed(4)}`,
                stopLoss: (direction === "LONG" ? entryPrice * 0.98 : entryPrice * 1.02).toFixed(4),
                takeProfitZone: `TP1: ${(direction === "LONG" ? entryPrice * 1.04 : entryPrice * 0.96).toFixed(4)}`,
                confidence: 9.5 + (Math.random() * 0.3).toFixed(1), // 9.5-9.8
                riskNote: `Fading a strong ${coin.priceChangePercent > 0 ? 'pump' : 'dump'}. High volume detected.`,
                reason: `Identified on gainer/loser scan with >$${(MIN_VOLUME/1000000)}M volume.`,
                estimatedTimeToTps: "TP1: ~2-6h",
            };
            return [setup];
        }
        return [];

    } catch (error) {
        console.error('Failed to analyze gainers and losers:', error);
        return [];
    }
}

/**
 * Monitors an active trade for alerts by checking the order book.
 * @param {Object} trade - The active trade object.
 * @returns {Promise<Object|null>} An alert message or null.
 */
async function checkForTradeAlerts(trade) {
    console.log(`Checking for alerts on ${trade.symbol}...`);
    const url = `https://open-api.coinglass.com/public/v2/order_book_depth?symbol=${trade.symbol}&limit=10`;
     const options = {
        method: 'GET',
        headers: { 'cg-api-key': COINGLASS_API_KEY }
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) return null; // Don't error out, just skip this check
        const data = await response.json();

        if (!data.success || !data.data || !data.data.asks) return null;

        const { asks, bids } = data.data;
        const largeWallThreshold = 500000; // A single order worth > $500k

        const sellWall = asks.find(ask => parseFloat(ask.price) * parseFloat(ask.volume) > largeWallThreshold);
        if (sellWall) {
            return `Large whale sell wall detected at $${sellWall.price}.`;
        }

        const buyWall = bids.find(bid => parseFloat(bid.price) * parseFloat(bid.volume) > largeWallThreshold);
        if (buyWall) {
            return `Large whale buy wall detected at $${buyWall.price}.`;
        }

        return null;
    } catch (error) {
        console.error(`Failed to check alerts for ${trade.symbol}:`, error);
        return null;
    }
}


// --- CORE ANALYSIS LOOP ---
async function runAnalysisCycle() {
    console.log('--- Running New Analysis Cycle ---');
    const newSetups = await analyzeGainersAndLosers();
    for (const setup of newSetups) {
        const existing = tradeDatabase.find(t => t.symbol === setup.symbol && t.status === 'pending');
        if (!existing) {
            const newTrade = { ...setup, id: nextId++, status: 'pending', pnl: null, alertMessage: null };
            tradeDatabase.push(newTrade);
            console.log(`NEW SIGNAL ADDED: ${newTrade.symbol}`);
        }
    }

    const activeTrades = tradeDatabase.filter(t => t.status === 'active');
    for (const trade of activeTrades) {
        const alert = await checkForTradeAlerts(trade);
        if (alert) {
            trade.status = 'alert';
            trade.alertMessage = alert;
            console.log(`ALERT TRIGGERED for ${trade.symbol}: ${alert}`);
        }
    }
}

// --- API ENDPOINTS ---
app.use(cors());
app.use(express.json());

app.get('/api/signals', (req, res) => {
    res.json(tradeDatabase);
});

app.post('/api/signals/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, pnl } = req.body;
    const trade = tradeDatabase.find(t => t.id === parseInt(id));
    if (trade) {
        trade.status = status;
        if (pnl !== undefined) {
            trade.pnl = pnl;
        }
        res.json(trade);
    } else {
        res.status(404).json({ error: 'Trade not found' });
    }
});


// --- SERVER INITIALIZATION ---
app.listen(PORT, () => {
    console.log(`Market Sniper "Brain" is running on port ${PORT}`);
    runAnalysisCycle();
    setInterval(runAnalysisCycle, POLLING_INTERVAL);
});
