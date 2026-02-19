import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../../data/dataService';
import { Play, Square, Clock, Users, ChevronRight, ChevronDown } from 'lucide-react';
import Badge from '../ui/Badge';
import { useNavigate } from 'react-router-dom';
import Select from '../ui/Select';
import { toast } from 'react-hot-toast';

const ActiveTimerHeader = () => {
    const [activeTimer, setActiveTimer] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [timerDisplay, setTimerDisplay] = useState('00:00:00');
    const [isStarting, setIsStarting] = useState(false);
    const timerInterval = useRef(null);
    const navigate = useNavigate();

    const loadData = async () => {
        try {
            const [timer, accData] = await Promise.all([
                dataService.getActiveTimer(),
                dataService.getSupportAccounts()
            ]);
            setActiveTimer(timer);
            setAccounts(accData || []);
            if (timer) {
                setSelectedAccountId(timer.support_status_id);
            }
        } catch (err) {
            console.error('Failed to load timer data', err);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000); // Check more frequently
        return () => clearInterval(interval);
    }, []);

    const handleStart = async () => {
        if (!selectedAccountId) return;
        const acc = accounts.find(a => a.id === parseInt(selectedAccountId));
        if (!acc) return;

        setIsStarting(true);
        try {
            await dataService.startTimer({
                customer_id: acc.customer_id,
                support_status_id: acc.id,
                description: ''
            });
            toast.success('Timer started');
            await loadData();
        } catch (err) {
            toast.error('Failed to start timer');
        } finally {
            setIsStarting(false);
        }
    };

    const handleStop = async () => {
        try {
            const res = await dataService.stopTimer('');
            toast.success(`Timer stopped: ${(res.hours || 0).toFixed(2)}h logged`);
            await loadData();
        } catch (err) {
            toast.error('Failed to stop timer');
        }
    };

    useEffect(() => {
        if (activeTimer) {
            if (timerInterval.current) clearInterval(timerInterval.current);

            const start = new Date(activeTimer.start_time).getTime();

            const updateDisplay = () => {
                const now = new Date().getTime();
                // Ensure we handle potential timezone issues by ensuring start_time is treated as UTC if it lacks a timezone
                const startTimeStr = activeTimer.start_time.includes('Z') || activeTimer.start_time.includes('+')
                    ? activeTimer.start_time
                    : activeTimer.start_time.replace(' ', 'T') + 'Z';
                const start = new Date(startTimeStr).getTime();
                const diff = Math.max(0, now - start);

                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);

                setTimerDisplay(
                    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                );
            };

            updateDisplay();
            timerInterval.current = setInterval(updateDisplay, 1000);
        } else {
            if (timerInterval.current) clearInterval(timerInterval.current);
            setTimerDisplay('00:00:00');
        }

        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [activeTimer]);

    const accountOptions = accounts.map(acc => ({
        label: `${acc.company_name} - ${acc.package_name}`,
        value: acc.id.toString()
    }));

    return (
        <div className="flex items-center gap-3 bg-white border border-[var(--border-subtle)] px-4 py-2 rounded-full shadow-sm">
            {!activeTimer ? (
                <>
                    <div className="w-[300px] max-w-[300px]">
                        <Select
                            placeholder="Select Work Area..."
                            options={accountOptions}
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="!gap-0"
                            triggerStyle={{
                                height: '32px',
                                borderRadius: '16px',
                                border: 'none',
                                background: 'var(--bg-app)',
                                paddingLeft: '12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                width: '100%'
                            }}
                        />
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={!selectedAccountId || isStarting}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${!selectedAccountId ? 'bg-gray-100 text-gray-300' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                            }`}
                        title="Start Tracking"
                    >
                        <Play size={14} fill="currentColor" />
                    </button>
                    <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1" />
                    <span className="text-[12px] font-mono font-bold text-[var(--text-muted)]">00:00:00</span>
                </>
            ) : (
                <>
                    <div className="flex flex-col min-w-[140px]">
                        <div className="flex items-center gap-1.5 leading-none mb-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[12px] font-black text-[var(--text-main)] truncate max-w-[150px]">
                                {activeTimer.company_name}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter ml-3">
                            {activeTimer.package_name}
                        </span>
                    </div>

                    <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1" />

                    <span className="text-[14px] font-mono font-black text-[var(--primary)]">{timerDisplay}</span>

                    <button
                        onClick={handleStop}
                        className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md ml-1"
                        title="Stop Session"
                    >
                        <Square size={14} fill="currentColor" />
                    </button>
                </>
            )}
        </div>
    );
};

export default ActiveTimerHeader;
