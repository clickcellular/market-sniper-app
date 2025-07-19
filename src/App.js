import React, { useState, useEffect, useRef } from 'react';

// --- Helper Components ---
const LongIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L12 20" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 10L12 4L6 10" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const ShortIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20L12 4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 14L12 20L18 14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const AlertIcon = ({ className = '' }) => (<svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 17C11.45 17 11 16.55 11 16V12C11 11.45 11.45 11 12 11C12.55 11 13 11.45 13 12V16C13 16.55 12.55 17 12 17ZM13 9H11V7H13V9Z" fill="currentColor"/></svg>);

// --- Main UI Components ---
const Header = ({ lastSignalTime }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);
    
    const timeAgo = lastSignalTime ? Math.round((new Date() - new Date(lastSignalTime)) / 60000) : null;

    return (
        <header className="bg-gray-900 text-white p-4 shadow-lg border-b border-gray-700 sticky top-0 z-20">
            <div className="container mx-auto flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-wider">Market Sniper <span className="text-cyan-400">v5.9</span></h1>
                    <p className="text-sm text-gray-400">Live Analysis Dashboard</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-400">Last New Signal</p>
                    <p className="text-lg font-mono text-cyan-300">{timeAgo !== null ? `${timeAgo} min ago` : 'Waiting...'}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-mono">{currentTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-md font-mono text-gray-300">{currentTime.toLocaleTimeString()}</p>
                </div>
            </div>
        </header>
    );
};

const SignalCard = ({ signal, onAcceptTrade, onOpenCloseModal }) => {
    const isLong = signal.direction === 'LONG';
    const statusStyles = { pending: 'bg-gray-500 text-white', active: 'bg-blue-500 text-white animate-pulse', alert: signal.alertType === 'positive' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black', closed_profit: 'bg-green-600 text-white', closed_loss: 'bg-red-600 text-white' };
    const isClosed = signal.status.includes('closed');

    return (
        <div className={`bg-gray-800 border ${isClosed ? 'border-gray-800' : 'border-gray-700'} rounded-lg shadow-xl overflow-hidden transition-all duration-500 ${isClosed ? 'opacity-50' : ''}`}>
            <div className={`p-4 flex justify-between items-center border-b border-gray-700/50 ${isLong ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                <div className="flex items-center space-x-3"><h2 className="text-2xl font-bold text-white">{signal.symbol}</h2></div>
                <div className="flex items-center space-x-2"><span className={`px-3 py-1 text-xs font-bold rounded-full ${statusStyles[signal.status]}`}>{isClosed ? `CLOSED` : signal.status.toUpperCase()}</span></div>
            </div>
            
            {signal.status === 'alert' && (
                <div className={`p-4 border-b ${signal.alertType === 'positive' ? 'bg-green-900/50 border-green-700 text-green-400' : 'bg-yellow-900/50 border-yellow-700 text-yellow-400'}`}>
                    <div className="flex items-center space-x-3"><AlertIcon className="h-5 w-5"/><h3 className="text-lg font-bold">Trade Alert!</h3></div>
                    <p className="mt-2 pl-8">{signal.alertMessage}</p>
                </div>
            )}

            {isClosed && (<div className={`p-4 text-center border-b border-gray-700 ${signal.pnl >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'}`}><p className="text-gray-400 text-sm">Trade Closed at ${signal.entryPrice} with P&L:</p><p className={`text-3xl font-bold ${signal.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{signal.pnl >= 0 ? `+$${signal.pnl.toFixed(2)}` : `-$${Math.abs(signal.pnl).toFixed(2)}`}</p></div>)}
            
            <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                    <div className="space-y-3">
                        <div className="flex justify-between items-baseline"><span className="font-semibold text-gray-400">Entry Zone:</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded">{signal.entryZone}</span></div>
                        <div className="flex justify-between items-baseline"><span className="font-semibold text-gray-400">Stop Loss:</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded">{signal.stopLoss}</span></div>
                        <div className="flex justify-between items-baseline"><span className="font-semibold text-gray-400">Take Profit:</span><span className="font-mono text-white bg-gray-700 px-2 py-1 rounded">{signal.takeProfitZone}</span></div>
                    </div>
                    <div className="flex flex-col justify-center items-center bg-gray-900/50 p-3 rounded-md">
                        <span className="text-sm font-semibold text-gray-400 mb-2">Confidence</span>
                        <div className="w-full bg-gray-700 rounded-full h-4"><div className={`${signal.confidence > 9.5 ? 'bg-green-500' : 'bg-yellow-500'} h-4 rounded-full`} style={{ width: `${((signal.confidence - 8) / 2) * 100}%` }}></div></div>
                        <span className="mt-2 text-xl font-bold text-white">{signal.confidence}/10</span>
                    </div>
                </div>
                {signal.status === 'pending' && (<button onClick={() => onAcceptTrade(signal.id)} className="mt-5 w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">Accept Trade</button>)}
                {(signal.status === 'active' || signal.status === 'alert') && (<button onClick={() => onOpenCloseModal(signal)} className="mt-5 w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700">Close Trade</button>)}
            </div>
        </div>
    );
};

const ActionModal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-30">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
            {children}
        </div>
    </div>
);

const LoadingSpinner = () => (<div className="flex justify-center items-center p-10"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div></div>);

// --- Main App Component ---
export default function App() {
    const [signals, setSignals] = useState([]);
    const [lastSignalTime, setLastSignalTime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState({ isOpen: false, type: null, signal: null });
    
    const API_URL = 'http://localhost:5000'; // The URL of your backend server

    const fetchBackendData = async () => {
        try {
            const [signalsRes, statusRes] = await Promise.all([
                fetch(`${API_URL}/api/signals`),
                fetch(`${API_URL}/api/status`)
            ]);
            if (!signalsRes.ok || !statusRes.ok) throw new Error('Failed to fetch data from backend.');
            const signalsData = await signalsRes.json();
            const statusData = await statusRes.json();
            setSignals(signalsData);
            setLastSignalTime(statusData.lastSignalTime);
        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const postToBackend = async (endpoint, body) => {
        try {
            await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            await fetchBackendData(); // Refresh data after any update
        } catch (err) {
            setError('Failed to update backend.');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchBackendData();
        const interval = setInterval(fetchBackendData, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleAcceptTrade = (signalId, entryPrice) => {
        postToBackend(`/api/signals/${signalId}/status`, { status: 'active', entryPrice });
        setModal({ isOpen: false });
    };

    const handleCloseTrade = (signalId, pnl) => {
        const status = pnl >= 0 ? 'closed_profit' : 'closed_loss';
        postToBackend(`/api/signals/${signalId}/status`, { status, pnl });
        setModal({ isOpen: false });
    };

    const openModal = (type, signal) => setModal({ isOpen: true, type, signal });

    return (
        <div className="bg-gray-900 min-h-screen font-sans">
            <Header lastSignalTime={lastSignalTime} />
            <main className="container mx-auto p-4 md:p-8">
                {loading ? <LoadingSpinner /> : 
                 error ? <div className="text-center text-red-500 bg-red-900/50 p-4 rounded-lg">{error}</div> : 
                 signals.length === 0 ? <div className="text-center text-gray-400">No high-confidence signals found. Market is being monitored...</div> :
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {signals.map((signal) => (
                        <SignalCard key={signal.id} signal={signal} onAcceptTrade={() => openModal('accept', signal)} onOpenCloseModal={() => openModal('close', signal)} />
                    ))}
                 </div>
                }
            </main>
            {modal.isOpen && (
                <ActionModal title={modal.type === 'accept' ? 'Accept Trade' : 'Close Trade'} onClose={() => setModal({ isOpen: false })}>
                    {modal.type === 'accept' && <AcceptTradeForm signal={modal.signal} onSubmit={handleAcceptTrade} onCancel={() => setModal({ isOpen: false })} />}
                    {modal.type === 'close' && <CloseTradeForm signal={modal.signal} onSubmit={handleCloseTrade} onCancel={() => setModal({ isOpen: false })} />}
                </ActionModal>
            )}
        </div>
    );
}

// --- Form Components for Modals ---
const AcceptTradeForm = ({ signal, onSubmit, onCancel }) => {
    const [entryPrice, setEntryPrice] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(signal.id, parseFloat(entryPrice)); };
    return (
        <form onSubmit={handleSubmit}>
            <p className="text-gray-400 mb-4">Enter your exact entry price for {signal.symbol}.</p>
            <label htmlFor="entryPrice" className="text-sm font-medium text-gray-300">Entry Price</label>
            <input type="number" step="any" id="entryPrice" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-white" required />
            <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md text-gray-300 bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md text-white bg-blue-600">Accept</button>
            </div>
        </form>
    );
};

const CloseTradeForm = ({ signal, onSubmit, onCancel }) => {
    const [pnl, setPnl] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(signal.id, parseFloat(pnl)); };
    return (
        <form onSubmit={handleSubmit}>
            <p className="text-gray-400 mb-4">Enter the final Profit or Loss for {signal.symbol}.</p>
            <label htmlFor="pnl" className="text-sm font-medium text-gray-300">P&L (USD)</label>
            <input type="number" step="any" id="pnl" value={pnl} onChange={(e) => setPnl(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-white" placeholder="e.g., 51.42 or -20.50" required />
            <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md text-gray-300 bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md text-white bg-blue-600">Confirm</button>
            </div>
        </form>
    );
};
