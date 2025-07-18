import React, { useState, useEffect, useRef } from 'react';
import { Target, Clock, CheckCircle, XCircle, TrendingUp, TrendingDown, Shield, AlertTriangle, BarChart2, RefreshCw, WifiOff, Server, ToggleLeft, ToggleRight, Zap, FolderOpen, MinusCircle, PlusCircle, Megaphone, Star, Eye, LogIn } from 'lucide-react';

// --- SIMULATED MARKET SCANNER DATABASE ---
const generateMockData = (pair, basePrice, volatility, trend, sentiment, news, volume) => {
    const list = [];
    let currentPrice = basePrice;
    for (let i = 0; i < 10; i++) {
        const open = currentPrice;
        const high = open * (1 + (Math.random() * volatility) + (trend * 0.01));
        const low = open * (1 - (Math.random() * volatility));
        const close = (high + low) / 2 + (trend * open * volatility * 0.5);
        currentPrice = close;
        list.push({ t: Date.now() - (10 - i) * 3600000, o: open, h: high, l: low, c: close });
    }
    return { 
        success: true, code: "0", msg: "success", 
        data: { pair, list },
        sentiment, news, volume
    };
};

const MOCK_MARKET_SCAN_RESULTS = [
    // UPDATED: JASMY price recalibrated based on user's live chart
    generateMockData('JASMYUSDT', 0.016885, 0.08, 0.35, 'Positive', 'Tech Integration', 50), 
    generateMockData('NOTUSDT', 0.002366, 0.06, 0.15, 'Positive', 'Roadmap Update', 150),   
    generateMockData('ARBUSDT', 0.4485, 0.04, 0.1, 'Positive', null, 75), 
    generateMockData('XRPUSDT', 3.30, 0.03, 0.05, 'Neutral', null, 1200),
    generateMockData('LOWVOLUSDT', 1.2, 0.05, 0.3, 'Positive', null, 15), 
];


// --- MASTER TRADER ANALYSIS ENGINE v7.2 ---
const masterTraderAnalysisEngine = (scanResult, marketRegime) => {
    const { data, sentiment, news, volume } = scanResult;
    if (!data || !data.list || data.list.length < 5) return null;
    
    if (volume < 25) return null;

    const latest = data.list[data.list.length - 1];
    let score = 50;
    let tier = 3; 
    const closes = data.list.slice(-5).map(c => c.c);
    const trendStrength = closes[closes.length - 1] / closes[0] - 1;
    let direction = null;

    if (trendStrength > 0.05) { score += 20; direction = 'LONG'; } 
    else if (trendStrength < -0.05) { score += 20; direction = 'SHORT'; } 
    else { score -= 15; }
    
    const ranges = data.list.map(c => c.h - c.l);
    const atr = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    
    if (sentiment === 'Positive') score += 15;
    if (news && (news.includes('Delisting') || news.includes('Unlock'))) return null;
    if (news && direction === 'LONG') score += 10;
    
    if (score >= 90 && sentiment === 'Positive') {
        tier = 1; 
    } else if (score >= 85) {
        tier = 2; 
    }

    // Hunter Mode Threshold
    if (marketRegime.name === 'Hunter Mode' && score < 90) return null;

    if (score > 100) score = 100;

    const slMultiplier = 1.5; 
    const slDistance = atr * slMultiplier;
    
    const priceToTP1 = Math.abs(latest.c - (direction === 'LONG' ? latest.c + slDistance * 1.5 : latest.c - slDistance * 1.5));
    const hoursToTP1 = (priceToTP1 / atr) * 1; 
    const estTime = hoursToTP1 < 1 ? `${Math.round(hoursToTP1 * 60)}m` : `${hoursToTP1.toFixed(1)}h`;

    return {
        id: data.pair, symbol: data.pair, direction, confidence: Math.round(score), tier, status: 'HUNTER TARGET',
        entryZone: [latest.c - atr * 0.5, latest.c + atr * 0.2],
        tp1: direction === 'LONG' ? latest.c + slDistance * 1.5 : latest.c - slDistance * 1.5,
        tp2: direction === 'LONG' ? latest.c + slDistance * 3 : latest.c - slDistance * 3,
        sl: direction === 'LONG' ? latest.c - slDistance : latest.c + slDistance,
        estTime: estTime,
        confluence: { trend: 'Strong Momentum Detected', volatility: `${atr.toPrecision(2)} ATR`, regime: marketRegime.name }
    };
};

const transformApiData = (marketScanResults, marketRegime) => {
    return marketScanResults.map(res => masterTraderAnalysisEngine(res, marketRegime)).filter(Boolean).sort((a, b) => a.tier - b.tier || b.confidence - a.confidence);
};

// --- Helper Components ---
const StatusIcon = ({ status }) => <Target className="w-5 h-5 text-green-400 animate-pulse" />;
const ConfidenceMeter = ({ value }) => {
    const color = value >= 95 ? 'bg-cyan-500' : 'bg-green-500';
    return ( <div className="w-full bg-gray-700 rounded-full h-2.5"> <div className={`${color} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div> </div> );
};

const formatPrice = (price, symbol = "") => {
    if (typeof price !== 'number' || isNaN(price)) return '0.00';
    if (price > 0 && price < 0.01) {
        return price.toPrecision(4);
    }
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

const PositionRow = ({ position, onRemove }) => {
    const isShort = position.direction === 'SHORT';
    const pnl = isShort ? (position.entryPrice - position.currentPrice) * position.quantity : (position.currentPrice - position.entryPrice) * position.quantity;
    const isProfit = pnl >= 0;

    return (
        <div className="grid grid-cols-5 gap-4 items-center text-sm p-3 border-b border-gray-700/50">
            <div className={`font-bold ${isShort ? 'text-red-400' : 'text-green-400'}`}>{position.symbol.replace('USDT', '')} {position.direction}</div>
            <div className="font-mono">{formatPrice(position.entryPrice, position.symbol)}</div>
            <div className="font-mono">{formatPrice(position.currentPrice, position.symbol)}</div>
            <div className={`font-mono font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>{pnl.toFixed(2)} USDT</div>
            <button onClick={() => onRemove(position.id)} className="text-gray-500 hover:text-white justify-self-end"><MinusCircle size={18} /></button>
        </div>
    );
};

const TierBadge = ({ tier }) => {
    const tierStyles = {
        1: 'bg-cyan-500/20 text-cyan-400 border-cyan-500',
        2: 'bg-green-500/20 text-green-400 border-green-500',
    };
    return (
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-md border text-xs font-bold ${tierStyles[tier]}`}>
            <Star className="w-3 h-3" />
            <span>TIER {tier}</span>
        </div>
    );
};

const TradeCard = ({ trade, onSelect }) => {
    const isShort = trade.direction === 'SHORT';
    const cardBorderColor = {1: 'border-cyan-500', 2: 'border-green-500'}[trade.tier];
    return (
        <div className={`bg-gray-800/50 backdrop-blur-sm border ${cardBorderColor} rounded-2xl shadow-lg p-5 transition-all duration-300 hover:shadow-cyan-400/30 hover:border-cyan-400 cursor-pointer`} onClick={() => onSelect(trade)}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    {isShort ? <TrendingDown className="w-8 h-8 text-red-500" /> : <TrendingUp className="w-8 h-8 text-green-500" />}
                    <span className="text-2xl font-bold text-white">{trade.symbol.replace('USDT', '')}</span>
                    <TierBadge tier={trade.tier} />
                </div>
                <div className="text-right"> <div className="text-sm text-gray-400">Confidence</div> <div className="text-2xl font-bold text-cyan-400">{trade.confidence}%</div> </div>
            </div>
            <ConfidenceMeter value={trade.confidence} />
             <div className="flex items-center space-x-4 mt-4 font-semibold text-sm text-green-400"> 
                <div className="flex items-center space-x-2"><StatusIcon status={trade.status} /> <span>{trade.status}</span></div>
                <div className="flex items-center space-x-2 text-gray-400"><Clock size={16} /> <span>TP1 Est: ~{trade.estTime}</span></div>
             </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-center">
                <div> <div className="text-sm text-gray-400">Entry Zone</div> <div className="text-md font-mono text-white">{formatPrice(trade.entryZone[0], trade.symbol)} - {formatPrice(trade.entryZone[1], trade.symbol)}</div> </div>
                <div> <div className="text-sm text-gray-400">Take Profit 1</div> <div className="text-md font-mono text-green-400">{formatPrice(trade.tp1, trade.symbol)}</div> </div>
                <div> <div className="text-sm text-gray-400">Take Profit 2</div> <div className="text-md font-mono text-green-300">{formatPrice(trade.tp2, trade.symbol)}</div> </div>
                <div> <div className="text-sm text-gray-400">Adaptive SL (ATR)</div> <div className="text-md font-mono text-red-400">{formatPrice(trade.sl, trade.symbol)}</div> </div>
            </div>
        </div>
    );
};

const DetailModal = ({ trade, onClose, onTakeTrade }) => {
    if (!trade) return null;
    const isShort = trade.direction === 'SHORT';
    const getConfluenceIcon = (key) => {
        switch(key) {
            case 'trend': return <BarChart2 className="w-5 h-5 mr-3 text-cyan-400" />;
            case 'volatility': return <Zap className="w-5 h-5 mr-3 text-yellow-400" />;
            case 'regime': return <Server className="w-5 h-5 mr-3 text-purple-400" />;
            default: return <CheckCircle className="w-5 h-5 mr-3 text-gray-400" />;
        }
    }
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-cyan-500 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                    <div className="flex items-center space-x-3"> {isShort ? <TrendingDown className="w-8 h-8 text-red-500" /> : <TrendingUp className="w-8 h-8 text-green-500" />} <h2 className="text-2xl font-bold text-white">{trade.symbol.replace('USDT','')} - {trade.direction}</h2> </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"> <XCircle size={24} /> </button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                        <div>
                            <div className="text-gray-300 text-lg">Confidence Score</div>
                            <div className="text-2xl font-bold text-cyan-400">{trade.confidence}%</div>
                        </div>
                        <TierBadge tier={trade.tier} />
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Confluence Factors</h3>
                        <ul className="space-y-2 text-gray-200"> {Object.entries(trade.confluence).map(([key, value]) => ( <li key={key} className="flex items-center"> {getConfluenceIcon(key)} <span className="capitalize font-semibold w-28">{key}:</span> <span>{value}</span> </li> ))} </ul>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                         <h3 className="text-lg font-semibold text-cyan-400 mb-3">Trade Parameters</h3>
                        <div className="grid grid-cols-2 gap-3 font-mono">
                            <div><span className="font-semibold text-gray-400">Entry:</span> <span>{formatPrice(trade.entryZone[0], trade.symbol)} - {formatPrice(trade.entryZone[1], trade.symbol)}</span></div>
                            <div><span className="font-semibold text-gray-400">TP 1:</span> <span className="text-green-400">{formatPrice(trade.tp1, trade.symbol)}</span></div>
                            <div><span className="font-semibold text-gray-400">TP 2:</span> <span className="text-green-400">{formatPrice(trade.tp2, trade.symbol)}</span></div>
                            <div><span className="font-semibold text-gray-400">Adaptive SL:</span> <span className="text-red-500">{formatPrice(trade.sl, trade.symbol)}</span></div>
                        </div>
                    </div>
                    <button onClick={() => onTakeTrade(trade)} className="w-full mt-4 bg-cyan-600 text-white font-bold py-3 rounded-lg hover:bg-cyan-500 transition-all duration-300 flex items-center justify-center space-x-2"> <PlusCircle size={20} /> <span>Acknowledge & Monitor Trade</span> </button>
                </div>
            </div>
        </div>
    );
};


const EntryModal = ({ trade, onClose, onConfirm }) => {
    const [entryPrice, setEntryPrice] = useState(trade.entryZone[0].toFixed(5));
    const inputRef = useRef(null);

    useEffect(() => {
        if(inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleConfirm = () => {
        const price = parseFloat(entryPrice);
        if(!isNaN(price) && price > 0) {
            onConfirm(price);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-green-500 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Confirm Entry for {trade.symbol.replace('USDT','')}</h2>
                <p className="text-sm text-gray-400 mb-2">System suggests entry between {formatPrice(trade.entryZone[0], trade.symbol)} and {formatPrice(trade.entryZone[1], trade.symbol)}.</p>
                <div className="mb-4">
                    <label htmlFor="entryPrice" className="block text-sm font-medium text-gray-300 mb-1">Your Entry Price</label>
                    <input
                        ref={inputRef}
                        type="number"
                        id="entryPrice"
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white font-mono text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                </div>
                <div className="flex space-x-4">
                    <button onClick={onClose} className="w-full py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={handleConfirm} className="w-full py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const MarketRegimeDisplay = ({ regime }) => {
    return (
        <div className={`mb-6 p-4 rounded-lg flex items-center justify-center space-x-4 border border-dashed border-green-500/50 bg-green-500/20`}>
            <Target className="w-6 h-6 text-green-400" />
            <div>
                <h3 className="font-bold text-center text-green-300">HUNTER MODE ACTIVE</h3>
                <p className="text-sm text-center text-green-400/80">Market Regime: {regime.name}. Confidence threshold set to 90%. Scanning for A-Grade setups.</p>
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    const [trades, setTrades] = useState([]);
    const [openPositions, setOpenPositions] = useState([]);
    const [selectedTrade, setSelectedTrade] = useState(null);
    const [tradeToConfirm, setTradeToConfirm] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [marketRegime, setMarketRegime] = useState({
        name: 'Hunter Mode',
        catalyst: null,
    });

    const handleTakeTrade = (trade) => {
        setSelectedTrade(null);
        setTradeToConfirm(trade);
    };

    const handleConfirmEntry = (entryPrice) => {
        if (tradeToConfirm) {
            const newPosition = {
                id: tradeToConfirm.id,
                symbol: tradeToConfirm.symbol,
                direction: tradeToConfirm.direction,
                entryPrice: entryPrice,
                currentPrice: entryPrice,
                quantity: 1000 / entryPrice,
            };
            setOpenPositions(prev => [...prev, newPosition]);
        }
        setTradeToConfirm(null);
    };
    
    const handleRemovePosition = (id) => {
        setOpenPositions(prev => prev.filter(p => p.id !== id));
    };

    const fetchData = () => {
        setIsLoading(true);
        setTimeout(() => {
            const formattedTrades = transformApiData(MOCK_MARKET_SCAN_RESULTS, marketRegime);
            setTrades(formattedTrades);
            setLastUpdated(new Date());
            setIsLoading(false);
        }, 500);
    };

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, []);
    useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
    const handleSelectTrade = (trade) => setSelectedTrade(trade);
    const handleCloseModal = () => setSelectedTrade(null);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans bg-grid-gray-700/[0.2]">
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80"></div>
            <main className="container mx-auto px-4 py-8 relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-center mb-4 border-b border-gray-700/50 pb-4">
                    <div className="flex items-center space-x-3 mb-4 md:mb-0">
                        <Target className="w-10 h-10 text-cyan-400 animate-pulse" />
                        <div> <h1 className="text-3xl font-bold tracking-wider">MARKET SNIPER</h1> <p className="text-cyan-400 text-sm">Hunter Mode v5.3</p> </div>
                    </div>
                    <div className="text-center md:text-right">
                         <div className="font-mono text-lg">{currentTime.toLocaleDateString()}</div>
                         <div className="font-mono text-2xl text-gray-300">{currentTime.toLocaleTimeString()}</div>
                         {lastUpdated && <div className="text-xs text-gray-500 mt-1">Last Scan: {lastUpdated.toLocaleTimeString()}</div>}
                    </div>
                </header>
                
                <MarketRegimeDisplay regime={marketRegime} />

                <div className="mb-8 bg-gray-800/60 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-3">
                        <FolderOpen className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-xl font-semibold text-gray-200">Open Positions</h2>
                    </div>
                    <div className="grid grid-cols-5 gap-4 text-xs text-gray-400 font-semibold px-3 pb-2 border-b border-gray-600">
                        <span>PAIR</span><span>ENTRY</span><span>MARK</span><span>PNL</span><span className="text-right">CLOSE</span>
                    </div>
                    {openPositions.length === 0 && <div className="text-center py-4 text-gray-500">No open positions.</div>}
                    {openPositions.map(pos => <PositionRow key={pos.id} position={pos} onRemove={handleRemovePosition} />)}
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-300 tracking-wide">High-Conviction Targets (Confidence &gt; 90%)</h2>
                        <button onClick={fetchData} disabled={isLoading} className="text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"> <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /> </button>
                    </div>
                    {isLoading && <div className="text-center py-10 text-gray-400">Scanning Market...</div>}
                    {!isLoading && trades.length === 0 && <div className="text-center py-10 text-gray-500">No A-Grade opportunities detected. System is hunting.</div>}
                    {!isLoading && trades.map(trade => <TradeCard key={trade.id} trade={trade} onSelect={handleSelectTrade} />)}
                </div>

                <footer className="text-center mt-12 py-6 border-t border-gray-700/50">
                    <p className="text-gray-500 text-sm">For educational and informational purposes only. Trading involves substantial risk.</p>
                    <p className="text-gray-600 text-xs mt-1">Market Sniper v5.3 - Price Recalibration</p>
                </footer>
            </main>
            {selectedTrade && <DetailModal trade={selectedTrade} onClose={handleCloseModal} onTakeTrade={handleTakeTrade} />}
            {tradeToConfirm && <EntryModal trade={tradeToConfirm} onClose={() => setTradeToConfirm(null)} onConfirm={handleConfirmEntry} />}
        </div>
    );
}
