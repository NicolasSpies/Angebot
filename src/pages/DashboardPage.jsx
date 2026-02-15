import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Users, FileText, AlertTriangle, Plus, ArrowRight, Zap, Clock, CheckCircle, Briefcase, Calendar, Search } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatusPill from '../components/ui/StatusPill';

const DashboardPage = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        summary: { draftCount: 0, pendingCount: 0, signedCount: 0 },
        financials: { totalOpenValue: 0, forecastPending: 0, profitEstimate: 0 },
        performance: { monthlyPerformance: [], avgOfferValueMonth: 0, signedThisMonthCount: 0 },
        alerts: { expiringSoonCount: 0, oldDraftsCount: 0 },
        analytics: { topCategories: [], topClients: [], recentActivity: [] },
        projects: { activeProjectCount: 0, overdueProjectCount: 0 }
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const data = await dataService.getDashboardStats();
                if (data && !data.error) {
                    setStats(data);
                }
            } catch (err) {
                console.error('Failed to load dashboard stats', err);
            }
            setIsLoading(false);
        };
        loadDashboard();
    }, []);

    if (isLoading) return <div className="page-container flex items-center justify-center min-h-[400px]">Loading dashboard...</div>;

    const { summary, financials, performance, alerts, analytics, projects } = stats;

    return (
        <div className="page-container pb-24 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight mb-2">Dashboard</h1>
                    <p className="text-[14px] text-[var(--text-secondary)] font-medium">Overview of your business performance.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => window.location.reload()}>
                        <Zap size={16} className="mr-2 text-[var(--primary)]" /> Refresh
                    </Button>
                    <div className="flex bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-subtle)]">
                        <kbd className="px-2 py-1 text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded border border-[var(--border-subtle)] flex items-center gap-2">
                            <Command size={10} /> K
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-4 gap-4 mb-10">
                <button onClick={() => navigate('/offer/new')} className="flex items-center gap-4 p-4 bg-white border border-[var(--border-subtle)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group text-left">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={20} />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-[var(--text-main)]">New Offer</p>
                        <p className="text-[11px] text-[var(--text-muted)]">Create proposal</p>
                    </div>
                </button>
                <button onClick={() => navigate('/projects')} className="flex items-center gap-4 p-4 bg-white border border-[var(--border-subtle)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group text-left">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] text-[var(--text-main)] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-[var(--text-main)]">New Project</p>
                        <p className="text-[11px] text-[var(--text-muted)]">Start engagement</p>
                    </div>
                </button>
                <button onClick={() => navigate('/customers')} className="flex items-center gap-4 p-4 bg-white border border-[var(--border-subtle)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group text-left">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] text-[var(--text-main)] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-[var(--text-main)]">Add Client</p>
                        <p className="text-[11px] text-[var(--text-muted)]">Register entity</p>
                    </div>
                </button>
                <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))} className="flex items-center gap-4 p-4 bg-white border border-[var(--border-subtle)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group text-left">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] text-[var(--text-main)] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Search size={20} />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-[var(--text-main)]">Search</p>
                        <p className="text-[11px] text-[var(--text-muted)]">Find anything...</p>
                    </div>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                            <FileText size={20} />
                        </div>
                        <StatusPill status="draft" />
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums">{summary.draftCount}</p>
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Draft Proposals</p>
                </Card>

                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-[var(--warning-bg)] text-[var(--warning)]">
                            <Clock size={20} />
                        </div>
                        <StatusPill status="pending" />
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums">{summary.pendingCount}</p>
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Pending Approval</p>
                </Card>

                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-[var(--success-bg)] text-[var(--success)]">
                            <CheckCircle size={20} />
                        </div>
                        <StatusPill status="signed" />
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums">{summary.signedCount}</p>
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Closed Won</p>
                </Card>

                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
                            <Briefcase size={20} />
                        </div>
                        <Badge variant="primary">ACTIVE</Badge>
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums">{projects?.activeProjectCount || 0}</p>
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Active Projects</p>
                </Card>
            </div>

            {/* Charts & Financials */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                <Card padding="2rem" className="lg:col-span-2 border border-[var(--border-subtle)] shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-[16px] font-extrabold text-[var(--text-main)]">Revenue Performance</h3>
                            <p className="text-[12px] text-[var(--text-secondary)] font-medium">Monthly recognized revenue</p>
                        </div>
                        <Badge variant="neutral">2024</Badge>
                    </div>
                    <div style={{ height: '300px', width: '100%', marginLeft: '-20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performance.monthlyPerformance}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border-subtle)" />
                                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v / 1000}k`} dx={-10} />
                                <Tooltip
                                    cursor={{ fill: 'var(--bg-subtle)' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                                />
                                <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="flex flex-col gap-6">
                    <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2 text-[var(--text-muted)]">
                            <TrendingUp size={18} />
                            <span className="text-[12px] font-bold uppercase tracking-wider">Pipeline Value</span>
                        </div>
                        <p className="text-[32px] font-black text-[var(--text-main)] tracking-tight tabular-nums">
                            {formatCurrency(financials.totalOpenValue)}
                        </p>
                    </Card>

                    <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm flex-1 flex flex-col justify-center bg-[var(--primary-light)]/10">
                        <div className="flex items-center gap-3 mb-2 text-[var(--primary)]">
                            <Zap size={18} />
                            <span className="text-[12px] font-bold uppercase tracking-wider">Forecast Pending</span>
                        </div>
                        <p className="text-[32px] font-black text-[var(--primary)] tracking-tight tabular-nums">
                            {formatCurrency(financials.forecastPending)}
                        </p>
                    </Card>

                    <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm flex-1 flex flex-col justify-center bg-[var(--success-bg)]/10">
                        <div className="flex items-center gap-3 mb-2 text-[var(--success)]">
                            <CheckCircle size={18} />
                            <span className="text-[12px] font-bold uppercase tracking-wider">Signed This Month</span>
                        </div>
                        <p className="text-[32px] font-black text-[var(--success)] tracking-tight tabular-nums">
                            {performance.signedThisMonthCount}
                        </p>
                    </Card>
                </div>
            </div>

            <Card padding="0" className="border border-[var(--border-subtle)] shadow-sm overflow-hidden h-full">
                <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-3">
                        <Activity size={20} className="text-[var(--text-muted)]" />
                        <h3 className="text-[16px] font-extrabold text-[var(--text-main)]">Recent Activity</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
                        View All <ArrowRight size={14} className="ml-1" />
                    </Button>
                </div>
                <div>
                    {analytics.recentActivity.map((act, i) => {
                        const getIcon = (type) => {
                            if (type === 'offer') return <FileText size={16} />;
                            if (type === 'project') return <Briefcase size={16} />;
                            if (type === 'customer') return <Users size={16} />;
                            return <Activity size={16} />;
                        };
                        const getActionColor = (action) => {
                            if (action === 'created') return 'bg-blue-50 text-blue-600';
                            if (action === 'signed') return 'bg-green-50 text-green-600';
                            if (action === 'declined') return 'bg-red-50 text-red-600';
                            if (action === 'sent') return 'bg-amber-50 text-amber-600';
                            return 'bg-gray-50 text-gray-600';
                        };
                        const getDescription = (act) => {
                            const { entity_type, action, metadata } = act;
                            if (action === 'created') return <span>Created {entity_type} <span className="font-bold">"{metadata.name || 'Untitled'}"</span></span>;
                            if (action === 'updated') return <span>Updated {entity_type}</span>;
                            if (action === 'status_change') return <span>{entity_type} status: {metadata.newStatus}</span>;
                            if (action === 'sent') return <span>Sent offer to client</span>;
                            if (action === 'signed') return <span>Signed by {metadata.signedBy || 'Client'}</span>;
                            if (action === 'declined') return <span>Declined by client</span>;
                            return <span>{action.replace(/_/g, ' ')}</span>;
                        };

                        return (
                            <div key={i} onClick={() => {
                                if (act.entity_type === 'offer') navigate(`/offers/${act.entity_id}`);
                                else if (act.entity_type === 'project') navigate(`/projects/${act.entity_id}`);
                                else if (act.entity_type === 'customer') navigate(`/customers`);
                            }} className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getActionColor(act.action)}`}>
                                        {getIcon(act.entity_type)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[13px] font-medium text-[var(--text-main)] truncate block">
                                            {getDescription(act)}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-secondary)]">
                                            {new Date(act.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        );
                    })}
                    {analytics.recentActivity.length === 0 && (
                        <div className="p-8 text-center text-[var(--text-muted)] text-[13px]">
                            No activity recorded yet.
                        </div>
                    )}
                </div>
            </Card>

        </div>
    );
};

// Simple Command Icon for visual
const Command = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </svg>
);

export default DashboardPage;
