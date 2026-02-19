import React, { useState, useEffect, useCallback, useRef } from 'react';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import {
    Clock, Plus, Timer, Save, History, CheckCircle2,
    AlertCircle, Users, Briefcase, FileText, ChevronRight,
    Play, Square, MoreHorizontal, ArrowUpRight, Search,
    Zap, Calendar, Wallet, CreditCard, ExternalLink, Trash2,
    ChevronDown, Edit2, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import SimpleDatePicker from '../components/ui/SimpleDatePicker';
import { toast } from 'react-hot-toast';

const SupportPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [packages, setPackages] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [activeTimer, setActiveTimer] = useState(null);
    const [timerDisplay, setTimerDisplay] = useState('00:00:00');
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Expanding rows
    const [expandedAccountId, setExpandedAccountId] = useState(null);
    const [timeEntries, setTimeEntries] = useState([]);
    const [isEntriesLoading, setIsEntriesLoading] = useState(false);

    // Editing entries
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [editEntryForm, setEditEntryForm] = useState({ duration: '01:00', description: '', date: '' });

    // Modals & Dialogs
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [isTrashDialogOpen, setIsTrashDialogOpen] = useState(false);
    const [targetTrashId, setTargetTrashId] = useState(null);
    const [isEntryDeleteDialogOpen, setIsEntryDeleteDialogOpen] = useState(false);
    const [targetEntryDeleteId, setTargetEntryDeleteId] = useState(null);

    // Forms
    const [assignForm, setAssignForm] = useState({ customer_id: '', package_id: '' });
    const [inlineManualId, setInlineManualId] = useState(null);
    const [durationInput, setDurationInput] = useState('01:00');

    const timerInterval = useRef(null);

    // Helper: decimal hours to hh:mm
    const hoursToHM = (decimalHours) => {
        if (!decimalHours) return '00:00';
        const totalMinutes = Math.round(decimalHours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Helper: hh:mm to decimal hours
    const hmToHours = (hm) => {
        if (!hm || !hm.includes(':')) return 0;
        const [h, m] = hm.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return 0;
        return h + (m / 60);
    };

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [accData, pkgData, custData, settsData, timerData] = await Promise.all([
                dataService.getSupportAccounts(),
                dataService.getSupportPackages(),
                dataService.getCustomers(),
                dataService.getSettings(),
                dataService.getActiveTimer()
            ]);
            setAccounts(accData || []);
            setPackages(pkgData || []);
            setCustomers(custData || []);
            setSettings(settsData);
            setActiveTimer(timerData);
        } catch (err) {
            console.error('Failed to load support data', err);
            toast.error('Failed to load support data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadTimeEntries = async (accountId) => {
        setIsEntriesLoading(true);
        try {
            const data = await dataService.getSupportTimeEntries(accountId);
            setTimeEntries(data || []);
        } catch (err) {
            toast.error('Failed to load time entries');
        } finally {
            setIsEntriesLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (expandedAccountId) {
            loadTimeEntries(expandedAccountId);
        }
    }, [expandedAccountId]);

    // Timer logic
    useEffect(() => {
        if (activeTimer) {
            if (timerInterval.current) clearInterval(timerInterval.current);

            const updateDisplay = () => {
                const now = new Date().getTime();
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

    const handleStartTimer = async (acc) => {
        if (activeTimer) {
            toast.error('A timer is already running');
            return;
        }
        try {
            await dataService.startTimer({
                customer_id: acc.customer_id,
                support_status_id: acc.id,
                description: ''
            });
            toast.success('Timer started');
            loadData();
        } catch (err) {
            toast.error('Failed to start timer');
        }
    };

    const handleStopTimer = async () => {
        try {
            const res = await dataService.stopTimer('');
            toast.success(`Timer stopped: ${hoursToHM(res.hours)} logged`);
            loadData();
            if (expandedAccountId) loadTimeEntries(expandedAccountId);
        } catch (err) {
            toast.error('Failed to stop timer');
        }
    };

    const handleInlineManualSubmit = async (acc) => {
        const decimalHours = hmToHours(durationInput);
        if (decimalHours <= 0) {
            toast.error('Please enter a valid duration (hh:mm)');
            return;
        }

        try {
            await dataService.logSupportHours(acc.customer_id, {
                hours: decimalHours,
                support_status_id: acc.id,
                description: '',
                date: new Date().toISOString()
            });
            toast.success('Hours logged');
            setInlineManualId(null);
            loadData();
            if (expandedAccountId === acc.id) loadTimeEntries(acc.id);
        } catch (err) {
            toast.error('Failed to log hours');
        }
    };

    const handleAssignPackage = async () => {
        if (!assignForm.customer_id || !assignForm.package_id) {
            toast.error('Selection required');
            return;
        }
        try {
            await dataService.assignSupportPackage(assignForm.customer_id, assignForm.package_id);
            toast.success('Support package assigned');
            setShowAssignModal(false);
            loadData();
        } catch (err) {
            toast.error('Failed to assign package');
        }
    };

    const handleTrash = (id) => {
        setTargetTrashId(id);
        setIsTrashDialogOpen(true);
    };

    const confirmTrash = async () => {
        try {
            await dataService.trashSupportPackage(targetTrashId);
            toast.success('Support account moved to trash');
            loadData();
        } catch (err) {
            toast.error('Failed to move account to trash');
        }
    };

    const handleEditEntry = (entry) => {
        setEditingEntryId(entry.id);
        setEditEntryForm({
            duration: hoursToHM(entry.hours),
            description: entry.description || '',
            date: entry.date ? entry.date.split('T')[0] : new Date().toISOString().split('T')[0]
        });
    };

    const handleUpdateEntry = async (id) => {
        const decimalHours = hmToHours(editEntryForm.duration);
        if (decimalHours <= 0) {
            toast.error('Invalid duration');
            return;
        }

        try {
            await dataService.updateSupportTimeEntry(id, {
                ...editEntryForm,
                hours: decimalHours
            });
            toast.success('Entry updated');
            setEditingEntryId(null);
            loadData();
            if (expandedAccountId) loadTimeEntries(expandedAccountId);
        } catch (err) {
            toast.error('Failed to update entry');
        }
    };

    const handleDeleteEntry = (id) => {
        setTargetEntryDeleteId(id);
        setIsEntryDeleteDialogOpen(true);
    };

    const confirmDeleteEntry = async () => {
        try {
            await dataService.deleteSupportTimeEntry(targetEntryDeleteId);
            toast.success('Entry deleted');
            loadData();
            if (expandedAccountId) loadTimeEntries(expandedAccountId);
        } catch (err) {
            toast.error('Failed to delete entry');
        }
    };

    const filteredAccounts = accounts.filter(acc => {
        const matchesSearch = acc.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acc.package_name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch && acc.status === 'active';
    });

    const formatSecondsToHM = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const toggleExpand = (id) => {
        setExpandedAccountId(expandedAccountId === id ? null : id);
    };

    return (
        <div className="page-container" style={{ maxWidth: '1400px' }}>
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                        Support Monitoring
                        <Badge variant="neutral" className="bg-[var(--primary-bg)] text-[var(--primary)] border-none px-3 py-1 text-[11px]">
                            {accounts.length} ACTIVE ACCOUNTS
                        </Badge>
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium max-w-2xl leading-relaxed">
                        Track support deliverables in <span className="text-[var(--text-main)] font-bold">EUR (€)</span>. Managed via single-timer logic.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setShowAssignModal(true)}
                        className="font-black h-11 px-6 shadow-lg shadow-[var(--primary)]/10"
                    >
                        <Plus size={20} className="mr-2" /> New Support
                    </Button>
                </div>
            </div>

            {/* Active Accounts Stacked List */}
            <div className="space-y-4">
                {filteredAccounts.length === 0 ? (
                    <Card className="p-20 text-center border-[var(--border-medium)]">
                        <div className="max-w-[200px] mx-auto opacity-30 grayscale mb-4">
                            <Users size={48} className="mx-auto" />
                        </div>
                        <p className="text-[var(--text-main)] font-black uppercase tracking-widest text-sm">No active support accounts</p>
                        <p className="text-[var(--text-muted)] text-xs mt-1">Assign a support package to a client to start tracking.</p>
                    </Card>
                ) : filteredAccounts.map(acc => {
                    const balanceRatio = acc.is_pay_as_you_go ? 0 : (acc.balance_hours || 0) / (acc.included_hours || 1);
                    const usagePercent = acc.is_pay_as_you_go ? 0 : Math.min(100, (1 - balanceRatio) * 100);
                    const barColor = (acc.balance_hours || 0) <= 0 ? 'from-red-500 to-rose-600' :
                        balanceRatio < 0.2 ? 'from-orange-400 to-amber-600' : 'from-emerald-400 to-teal-600';
                    const textColor = (acc.balance_hours || 0) <= 0 ? 'text-red-600' :
                        balanceRatio < 0.2 ? 'text-amber-600' : 'text-emerald-600';

                    // PYG Precision: (seconds / 3600) * rate
                    const pygValue = (acc.unbilled_seconds / 3600) * (acc.hourly_rate || 140);

                    return (
                        <div key={acc.id} className="group">
                            <Card className={`p-6 border-[var(--border-medium)] hover:shadow-md transition-all relative overflow-visible ${expandedAccountId === acc.id ? 'rounded-b-none border-b-transparent shadow-md' : ''}`}>
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    {/* Identity + Expand */}
                                    <div className="flex items-center gap-4 min-w-[280px]">
                                        <button
                                            onClick={() => toggleExpand(acc.id)}
                                            className={`p-1.5 rounded-lg hover:bg-[var(--bg-app)] transition-all ${expandedAccountId === acc.id ? 'rotate-180 bg-[var(--bg-app)]' : ''}`}
                                        >
                                            <ChevronDown size={20} className="text-[var(--text-muted)]" />
                                        </button>
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-app)] text-[var(--text-main)] font-black flex items-center justify-center text-[12px] border border-[var(--border-subtle)]">
                                            {acc.company_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-[var(--text-main)] text-[16px] truncate">{acc.company_name}</div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                                {acc.package_name}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balance & Progress */}
                                    <div className="flex-1 w-full md:w-auto">
                                        <div className="flex items-center justify-between mb-2">
                                            {acc.is_pay_as_you_go ? (
                                                <div className="flex flex-col">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-[18px] font-black text-amber-600 italic">
                                                            {formatSecondsToHM(acc.unbilled_seconds)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Unbilled time</span>
                                                    </div>
                                                    <div className="text-[14px] font-black text-[var(--text-main)]">
                                                        {formatCurrency(pygValue)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className={`text-[18px] font-black italic ${textColor}`}>
                                                            {hoursToHM(acc.balance_hours)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Remaining balance</span>
                                                    </div>
                                                    <div className="text-[11px] font-bold text-[var(--text-muted)] opacity-60">
                                                        Bundle: {formatCurrency(acc.price || 0)} for {acc.included_hours}h
                                                    </div>
                                                </div>
                                            )}
                                            <Badge variant="neutral" className="bg-[var(--bg-app)] text-[var(--text-muted)] border-none text-[9px] font-black">
                                                {acc.is_pay_as_you_go ? 'PAY-AS-YOU-GO' : 'PREPAID BUNDLE'}
                                            </Badge>
                                        </div>
                                        {!acc.is_pay_as_you_go && (
                                            <div className="w-full h-2.5 bg-[var(--bg-app)] rounded-full overflow-hidden border border-[var(--border-subtle)]/30 p-[1px]">
                                                <div
                                                    className={`h-full transition-all duration-700 ease-out bg-gradient-to-r rounded-full ${barColor}`}
                                                    style={{ width: `${Math.max(0, (acc.balance_hours / acc.included_hours) * 100)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions - Always Visible Standard Black Buttons */}
                                    <div className="flex items-center gap-3">
                                        {inlineManualId === acc.id ? (
                                            <div className="flex items-center gap-2 bg-[var(--bg-app)] p-1.5 rounded-xl border border-[var(--border-subtle)] shadow-sm animate-in slide-in-from-right-2">
                                                <input
                                                    type="text"
                                                    value={durationInput}
                                                    onChange={(e) => setDurationInput(e.target.value)}
                                                    className="w-16 h-9 bg-white border border-[var(--border-medium)] rounded-[var(--radius-md)] text-center font-black text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
                                                    placeholder="hh:mm"
                                                />
                                                <Button
                                                    size="sm"
                                                    className="h-9 px-4 font-black text-[11px] uppercase"
                                                    onClick={() => handleInlineManualSubmit(acc)}
                                                >
                                                    LOG TIME
                                                </Button>
                                                <button
                                                    onClick={() => setInlineManualId(null)}
                                                    className="h-9 w-9 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                className="h-10 px-6 font-black text-[11px] uppercase tracking-wider"
                                                onClick={() => {
                                                    setDurationInput('01:00');
                                                    setInlineManualId(acc.id);
                                                }}
                                            >
                                                <Clock size={15} className="mr-2" /> Manual Log
                                            </Button>
                                        )}

                                        <Button
                                            variant="primary"
                                            className={`h-10 px-6 font-black text-[11px] uppercase tracking-wider transition-all ${activeTimer?.support_status_id === acc.id ? 'bg-[var(--danger)] hover:bg-[var(--danger)]/90' : ''}`}
                                            onClick={() => activeTimer?.support_status_id === acc.id ? handleStopTimer() : handleStartTimer(acc)}
                                            disabled={activeTimer && activeTimer.support_status_id !== acc.id}
                                        >
                                            {activeTimer?.support_status_id === acc.id ? (
                                                <><Square size={15} className="mr-2" fill="currentColor" /> Stop</>
                                            ) : (
                                                <><Play size={15} className="mr-2" fill="currentColor" /> Start Track</>
                                            )}
                                        </Button>

                                        <button
                                            onClick={() => handleTrash(acc.id)}
                                            className="w-10 h-10 rounded-xl text-[var(--text-muted)] flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-[var(--border-subtle)] shadow-sm"
                                            title="Move to Trash"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </Card>

                            {/* Expanded Section (Time Entries) */}
                            {expandedAccountId === acc.id && (
                                <div className="bg-[var(--bg-card)] border-x border-b border-[var(--border-medium)] rounded-b-2xl p-8 shadow-inner animate-in slide-in-from-top-4">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-[var(--primary-light)] text-[var(--primary)] rounded-lg">
                                                <History size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-[13px] font-black uppercase tracking-widest text-[var(--text-main)]">Support Activity Log</h3>
                                                <p className="text-[11px] text-[var(--text-secondary)] font-medium">History of sessions and manual logs</p>
                                            </div>
                                        </div>
                                        <Badge variant="neutral" className="bg-[var(--bg-app)] border-none text-[10px] font-bold px-3 py-1">
                                            {timeEntries.length} LOG ENTRIES
                                        </Badge>
                                    </div>

                                    {isEntriesLoading ? (
                                        <div className="py-16 text-center">
                                            <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        </div>
                                    ) : timeEntries.length === 0 ? (
                                        <div className="py-16 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-app)]/50">
                                            <Clock size={32} className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" />
                                            <p className="text-[var(--text-secondary)] text-[12px] font-bold uppercase tracking-wider">No time entries recorded</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {timeEntries.map(entry => (
                                                <div key={entry.id} className={`group/entry relative flex items-center justify-between p-4 bg-[var(--bg-app)]/40 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-white hover:shadow-sm transition-all ${editingEntryId === entry.id ? 'ring-2 ring-[var(--primary)]/5 border-[var(--primary)] bg-white shadow-md' : ''}`}>
                                                    <div className="flex items-center gap-8 flex-1">
                                                        {/* Duration */}
                                                        <div className="w-24 shrink-0">
                                                            {editingEntryId === entry.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editEntryForm.duration}
                                                                    onChange={(e) => setEditEntryForm({ ...editEntryForm, duration: e.target.value })}
                                                                    className="w-full h-9 bg-white border border-[var(--border-medium)] rounded-[var(--radius-md)] text-center font-black text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
                                                                    placeholder="hh:mm"
                                                                />
                                                            ) : (
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-[16px] font-black text-[var(--primary)]">{hoursToHM(entry.hours)}</span>
                                                                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">time</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Description */}
                                                        <div className="flex-1 min-w-0">
                                                            {editingEntryId === entry.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editEntryForm.description}
                                                                    onChange={(e) => setEditEntryForm({ ...editEntryForm, description: e.target.value })}
                                                                    className="w-full h-9 px-3 bg-white border border-[var(--border-medium)] rounded-[var(--radius-md)] text-[13px] font-medium outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
                                                                    placeholder="What was worked on?"
                                                                />
                                                            ) : (
                                                                <div className="text-[13px] font-bold text-[var(--text-main)] truncate group-hover/entry:text-[var(--primary)] transition-colors">
                                                                    {entry.description || <span className="text-[var(--text-muted)] font-medium italic">No description provided</span>}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Date */}
                                                        <div className="w-36 shrink-0">
                                                            {editingEntryId === entry.id ? (
                                                                <SimpleDatePicker
                                                                    value={editEntryForm.date}
                                                                    onChange={(val) => setEditEntryForm({ ...editEntryForm, date: val })}
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                                                    <Calendar size={14} />
                                                                    <span className="text-[11px] font-black uppercase tracking-tight">
                                                                        {new Date(entry.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Row Actions */}
                                                    <div className="flex items-center gap-1 ml-6">
                                                        {editingEntryId === entry.id ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-9 w-9 p-0 bg-emerald-500 hover:bg-emerald-600 border-none"
                                                                    onClick={() => handleUpdateEntry(entry.id)}
                                                                >
                                                                    <CheckCircle2 size={16} />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-9 w-9 p-0 bg-white text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-red-50 hover:text-red-500"
                                                                    onClick={() => setEditingEntryId(null)}
                                                                >
                                                                    <X size={16} />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEditEntry(entry)}
                                                                    className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-white rounded-lg transition-all"
                                                                    title="Edit Log"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                                    className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                                                    title="Delete Log"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* In-App Dialogs & Modals */}
            <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Support Package" maxWidth="500px">
                <div className="space-y-6">
                    <Select
                        label="Client"
                        value={assignForm.customer_id}
                        onChange={(e) => setAssignForm({ ...assignForm, customer_id: e.target.value })}
                        options={[
                            { label: 'Select Client...', value: '' },
                            ...customers.map(c => ({ label: c.company_name, value: c.id }))
                        ]}
                    />
                    <Select
                        label="Support Package"
                        value={assignForm.package_id}
                        onChange={(e) => setAssignForm({ ...assignForm, package_id: e.target.value })}
                        options={[
                            { label: 'Select Package...', value: '' },
                            ...packages.map(p => ({ label: `${p.name} (${p.is_pay_as_you_go ? 'PYG' : p.included_hours + 'h'})`, value: p.id }))
                        ]}
                    />
                    <div className="bg-[var(--bg-app)] p-4 rounded-xl border border-[var(--border-subtle)]">
                        <p className="text-[12px] text-[var(--text-secondary)] font-medium italic">
                            New support assignments start with a full balance (Prepaid) or 0h (PYG).
                        </p>
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                        <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                        <Button onClick={handleAssignPackage} className="px-6 font-black">Assign Support</Button>
                    </div>
                </div>
            </Modal>

            {/* Trash Confirmation */}
            <ConfirmationDialog
                isOpen={isTrashDialogOpen}
                onClose={() => setIsTrashDialogOpen(false)}
                onConfirm={confirmTrash}
                title="Deactivate Support Account"
                message="This will move the support account to the Trash and stop all active tracking. You can restore it later from the Trash page if needed."
                confirmText="Move to Trash"
                isDestructive={true}
            />

            {/* Entry Delete Confirmation */}
            <ConfirmationDialog
                isOpen={isEntryDeleteDialogOpen}
                onClose={() => setIsEntryDeleteDialogOpen(false)}
                onConfirm={confirmDeleteEntry}
                title="Delete Time Entry"
                message="Are you sure you want to permanently delete this time entry? The support balance will be adjusted automatically to reflect this change."
                confirmText="Delete Entry"
                isDestructive={true}
            />
        </div>
    );
};

export default SupportPage;
