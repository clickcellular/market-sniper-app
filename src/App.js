import React, { useState, useEffect } from 'react';

// --- Helper Components ---

// Icon for Long signal
const LongIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4L12 20" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 10L12 4L6 10" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Icon for Short signal
const ShortIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20L12 4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 14L12 20L18 14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Icon for the alert/risk notes
const AlertIcon = ({ className = '' }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 17C11.45 17 11 16.55 11 16V12C11 11.45 11.45 11 12 11C12.55 11 13 11.45 13 12V16C13 16.55 12.55 17 12 17ZM13 9H11V7H13V9Z" fill="currentColor"/>
    </svg>
);

// --- Mock API Data ---

// This function simulates a network request to a backend.
const fetchSignalsFromAPI = () => {
  const mockSignals = [
    {
      id: 1,
      symbol: "XTZ/USDT",
      direction: "LONG",
      entryZone: "$0.815 - $0.820",
      stopLoss: "$0.795",
      takeProfitZone: "TP1: $0.855, TP2: $0.880",
      confidence: 9.5,
      riskNote: `"Bias Confirmed: LONG" - Momentum is strong and consistent.`,
      reason: "Structural Breakout & Volume Confirmation.",
      status: 'pending', // 'pending', 'active', 'alert'
      estimatedTimeToTps: "TP1: ~2-4 hours, TP2: ~8-12 hours",
      alertMessage: null,
    },
    {
      id: 2,
      symbol: "FTT/USDT",
      direction: "SHORT",
      entryZone: "$1.100 - $1.115",
      stopLoss: "$1.155",
      takeProfitZone: "TP1: $1.020, TP2: $0.950",
      confidence: 9.6,
      riskNote: `"Dump Risk Alert: LONG → SHORT trap" - Baiting longs on HTF.`,
      reason: "Exhaustion & Reversal on LTF.",
      status: 'pending',
      estimatedTimeToTps: "TP1: ~1-3 hours, TP2: ~6-10 hours",
      alertMessage: null,
    },
    {
      id: 3,
      symbol: "CROSS/USDT",
      direction: "LONG",
      entryZone: "$0.3130 - $0.3150",
      stopLoss: "$0.3050",
      takeProfitZone: "TP1: $0.3250, TP2: $0.3350",
      confidence: 9.5,
      riskNote: `"Reversal Alert: SHORT → LONG reversal" - Weakening downside momentum.`,
      reason: "Oversold Condition & LTF/HTF divergence.",
      status: 'pending',
      estimatedTimeToTps: "TP1: ~3-5 hours, TP2: ~10-16 hours",
      alertMessage: null,
    },
    {
      id: 4,
      symbol: "HAEDAL/USDT",
      direction: "SHORT",
      entryZone: "$0.1750 - $0.1765",
      stopLoss: "$0.1810",
      takeProfitZone: "TP1: $0.1650, TP2: $0.1580",
      confidence: 9.7,
      riskNote: `"Bias Confirmed: SHORT" - High-velocity downtrend.`,
      reason: "Confirmed Downtrend & LTF liquidity grab.",
      status: 'pending',
      estimatedTimeToTps: "TP1: ~2-4 hours, TP2: ~8-12 hours",
      alertMessage: null,
    }
  ];

  console.log("Fetching new signals...");
  return new Promise(resolve => {
    setTimeout(() => {
      console.log("Signals received.");
      resolve(mockSignals);
    }, 1500);
  });
};


// --- Components ---

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-gray-900 text-white p-4 shadow-lg border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">Market Sniper <span className="text-cyan-400">v5.5</span></h1>
          <p className="text-sm text-gray-400">Trade Management Dashboard</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono">{currentTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="text-md font-mono text-gray-300">{currentTime.toLocaleTimeString()}</p>
        </div>
      </div>
    </header>
  );
};

const SignalCard = ({ signal, onAcceptTrade }) => {
  const isLong = signal.direction === 'LONG';
  const confidenceColor = signal.confidence > 9.5 ? 'bg-green-500' : 'bg-yellow-500';
  const riskColor = signal.riskNote.includes('Reversal') ? 'text-yellow-400' : (isLong ? 'text-green-400' : 'text-red-400');
  
  const statusStyles = {
    pending: 'bg-gray-500 text-white',
    active: 'bg-blue-500 text-white animate-pulse',
    alert: 'bg-red-600 text-white animate-bounce',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden transition-all duration-300">
      {/* Card Header */}
      <div className={`p-4 flex justify-between items-center border-b border-gray-700 ${isLong ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
        <div className="flex items-center space-x-3">
          {isLong ? <LongIcon /> : <ShortIcon />}
          <h2 className="text-2xl font-bold text-white">{signal.symbol}</h2>
        </div>
        <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusStyles[signal.status]}`}>
                {signal.status.toUpperCase()}
            </span>
            <span className={`px-3 py-1 text-sm font-bold rounded-full ${isLong ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {signal.direction}
            </span>
        </div>
      </div>

      {/* Real-time Alert Box */}
      {signal.status === 'alert' && (
        <div className="p-4 bg-red-900/50 border-b border-red-700">
            <div className="flex items-center space-x-3 text-red-400">
                <AlertIcon className="animate-ping absolute h-5 w-5 opacity-75"/>
                <AlertIcon className="relative h-5 w-5"/>
                <h3 className="text-lg font-bold">Trade Alert!</h3>
            </div>
            <p className="mt-2 text-red-300 pl-8">{signal.alertMessage}</p>
        </div>
      )}

      {/* Card Body */}
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div className="space-y-3">
                <div className="flex justify-between items-baseline"><span className="font-semibold text-gray-400">Entry Zone:</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded">{signal.entryZone}</span></div>
                <div className="flex justify-between items-baseline"><span className="font-semibold text-gray-400">Stop Loss:</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded">{signal.stopLoss}</span></div>
                <div className="flex justify-between items-baseline"><span className="font-semibold text-gray-400">Take Profit:</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded">{signal.takeProfitZone}</span></div>
                <div className="flex justify-between items-baseline pt-2 border-t border-gray-700/50"><span className="font-semibold text-gray-400">Est. Time:</span><span className="text-sm text-cyan-400">{signal.estimatedTimeToTps}</span></div>
            </div>
            <div className="flex flex-col justify-center items-center bg-gray-900/50 p-3 rounded-md">
                <span className="text-sm font-semibold text-gray-400 mb-2">Confidence Level</span>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden"><div className={`${confidenceColor} h-4 rounded-full`} style={{ width: `${(signal.confidence / 10) * 100}%` }}></div></div>
                <span className="mt-2 text-xl font-bold text-white">{signal.confidence}/10</span>
            </div>
        </div>
        {signal.status === 'pending' && (
            <button onClick={() => onAcceptTrade(signal.id)} className="mt-5 w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300">
                Accept Trade
            </button>
        )}
      </div>

      {/* Card Footer */}
      <div className="p-5 border-t border-gray-700 bg-gray-800/50">
         <div className={`flex items-start space-x-3 p-3 rounded-md mb-4 ${riskColor.replace('text', 'bg')}/10`}><div className={`mt-1 ${riskColor}`}><AlertIcon /></div><div><h4 className="font-semibold text-white">Directional Risk Note</h4><p className={`text-sm ${riskColor}`}>{signal.riskNote}</p></div></div>
         <div><h4 className="font-semibold text-white mb-1">Reason</h4><p className="text-sm text-gray-400">{signal.reason}</p></div>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-10"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div></div>
);

// --- Main App Component ---

export default function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleAcceptTrade = (signalId) => {
    setSignals(prevSignals =>
      prevSignals.map(signal =>
        signal.id === signalId ? { ...signal, status: 'active' } : signal
      )
    );
    // Here, you would also send this update to your backend.
    console.log(`Accepted trade for signal ID: ${signalId}`);
  };
  
  // This effect simulates a real-time update for an active trade
  useEffect(() => {
    const activeSignal = signals.find(s => s.status === 'active' && !s.alertMessage);
    if (activeSignal) {
      const timeoutId = setTimeout(() => {
        setSignals(prevSignals =>
          prevSignals.map(signal =>
            signal.id === activeSignal.id
              ? { ...signal, status: 'alert', alertMessage: 'Whale activity detected: Large sell wall forming above entry. Consider tightening stop loss.' }
              : signal
          )
        );
      }, 10000); // 10 seconds after a trade is accepted
      return () => clearTimeout(timeoutId);
    }
  }, [signals]);


  useEffect(() => {
    const getSignals = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSignalsFromAPI();
        setSignals(data);
      } catch (err) {
        setError('Failed to fetch signals. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getSignals();
    
    const intervalId = setInterval(getSignals, 300000); // Refresh every 5 mins
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="bg-gray-900 min-h-screen font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {loading && signals.length === 0 ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-center text-red-500 bg-red-900/50 p-4 rounded-lg">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} onAcceptTrade={handleAcceptTrade} />
            ))}
          </div>
        )}
      </main>
      <footer className="text-center py-4 text-gray-500 text-xs">
        <p>Market Sniper v5.5 | Analysis Date: 19th July 2025</p>
        <p className="mt-1">This is not financial advice. Trading involves significant risk.</p>
      </footer>
    </div>
  );
}
