import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Users, FileText, AlertTriangle, Plus, ArrowRight, Zap, Clock, CheckCircle, Briefcase, Calendar, Search, Activity } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatusPill from '../components/ui/StatusPill';

const DashboardPage = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        summary: { draftCount: 0, pendingCount: 0, signedCount: 0, winRate: 0, avgDealSize: 0 },
        financials: { totalOpenValue: 0, forecastPending: 0, profitEstimate: 0, signedRevenue: 0, momGrowth: 0 },
        performance: { monthlyPerformance: [], avgOfferValueMonth: 0, signedThisMonthCount: 0, avgMonthlyIncome: 0 },
        alerts: { expiringSoonCount: 0, oldDraftsCount: 0, expiringOffers: [] },
        analytics: { topCategories: [], topClients: [], recentActivity: [] },
        projects: { activeProjectCount: 0, overdueProjectCount: 0, projectsByStatus: [] }
    });
    const [auditIssues, setAuditIssues] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const [data, auditData] = await Promise.all([
                    dataService.getDashboardStats(),
                    dataService.getAuditChecks()
                ]);

                if (data && !data.error) {
                    setStats(prev => ({
                        ...prev,
                        ...data,
                        summary: { ...prev.summary, ...data.summary },
                        financials: { ...prev.financials, ...data.financials },
                        performance: { ...prev.performance, ...data.performance },
                        alerts: { ...prev.alerts, ...data.alerts },
                        analytics: { ...prev.analytics, ...data.analytics },
                        projects: { ...prev.projects, ...data.projects }
                    }));
                }

                if (auditData && !auditData.error) {
                    setAuditIssues(auditData.issues || []);
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
                </div>
            </div>

            {/* Audit Alerts Section */}
            {auditIssues.length > 0 && (
                <div className="mb-10 bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="text-amber-600" size={20} />
                        <h2 className="text-[16px] font-bold text-amber-900">System Health Alerts</h2>
                        <Badge variant="warning" className="ml-auto">{auditIssues.length} issues found</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {auditIssues.slice(0, 3).map((issue, idx) => (
                            <div key={idx} className="bg-white/60 p-3 rounded-lg border border-amber-100 flex flex-col justify-between">
                                <div>
                                    <p className="text-[13px] font-bold text-amber-900 mb-1">{issue.title || 'Data Integrity Issue'}</p>
                                    <p className="text-[11px] text-amber-700 leading-relaxed">{issue.description}</p>
                                </div>
                                <Button variant="ghost" size="sm" className="mt-3 text-amber-600 h-8 self-start px-0 hover:bg-transparent" onClick={() => navigate('/settings/audit')}>
                                    Fix Issue <ArrowRight size={14} className="ml-1" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                <button onClick={() => navigate('/activity')} className="flex items-center gap-4 p-4 bg-white border border-[var(--border-subtle)] rounded-xl hover:border-[var(--primary)] hover:shadow-md transition-all group text-left">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] text-[var(--text-main)] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Activity size={20} />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-[var(--text-main)]">Activity Log</p>
                        <p className="text-[11px] text-[var(--text-muted)]">View history</p>
                    </div>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                            <TrendingUp size={20} />
                        </div>
                        <Badge variant="primary" className="text-[9px]">MTD</Badge>
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums">{formatCurrency(performance.revenueThisMonth || 0)}</p>
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Revenue This Month</p>
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
                        <div className="p-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
                            <Briefcase size={20} />
                        </div>
                        <Badge variant="neutral" className="text-[9px]">ACTIVE</Badge>
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums">{projects.activeProjectCount}</p>
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Projects in Progress</p>
                </Card>

                <Card padding="1.5rem" className={`border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all ${projects?.overdueProjectCount > 0 ? 'bg-red-50 border-red-200' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${projects?.overdueProjectCount > 0 ? 'bg-red-100 text-red-600' : 'bg-[var(--primary-light)] text-[var(--primary)]'}`}>
                            <AlertTriangle size={20} />
                        </div>
                        {projects?.overdueProjectCount > 0 && (
                            <Badge variant="danger" className="animate-pulse">CRITICAL</Badge>
                        )}
                    </div>
                    <p className={`text-[28px] font-black tabular-nums ${projects?.overdueProjectCount > 0 ? 'text-red-600' : 'text-[var(--text-main)]'}`}>
                        {projects?.overdueProjectCount || 0}
                    </p>
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">Overdue Projects</p>
                </Card>
            </div>

            {/* Charts & Financials */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                <Card padding="2rem" className="lg:col-span-2 border border-[var(--border-subtle)] shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-[16px] font-extrabold text-[var(--text-main)]">Revenue Performance</h3>
                                {financials.momGrowth !== 0 && (
                                    <div className={`flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded ${financials.momGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        <TrendingUp size={12} className={`mr-1 ${financials.momGrowth < 0 ? 'rotate-180' : ''}`} />
                                        {financials.momGrowth > 0 ? '+' : ''}{financials.momGrowth.toFixed(1)}% MoM
                                    </div>
                                )}
                            </div>
                            <p className="text-[12px] text-[var(--text-secondary)] font-medium">Monthly recognized revenue</p>
                        </div>
                        <Badge variant="neutral">Last 6 Months</Badge>
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
                            <span className="text-[12px] font-bold uppercase tracking-wider">Signed Total</span>
                        </div>
                        <p className="text-[32px] font-black text-[var(--success)] tracking-tight tabular-nums">
                            {formatCurrency(financials.signedRevenue || 0)}
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
                    {(analytics.recentActivity || []).map((act, i) => {
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
                            const entityName = <span className="font-bold underline md:no-underline md:group-hover:underline">"{metadata.name || 'Untitled'}"</span>;

                            if (action === 'created') return <span>Created {entity_type} {entityName}</span>;
                            if (action === 'updated') return <span>Updated {entity_type} {entityName}</span>;
                            if (action === 'status_change') return <span>{entity_type} {entityName} → <span className="font-extrabold">{metadata.newStatus}</span></span>;
                            if (action === 'sent') return <span>Sent offer {entityName} to client</span>;
                            if (action === 'signed') return <span>Offer {entityName} signed by <span className="font-extrabold">{metadata.signedBy || 'Client'}</span></span>;
                            if (action === 'declined') return <span>Offer {entityName} declined by client</span>;
                            if (action === 'archived') return <span>Archived {entity_type} {entityName}</span>;
                            if (action === 'restored') return <span>Restored {entity_type} {entityName}</span>;
                            if (action === 'linked_project') return <span>Linked offer {entityName} to project</span>;
                            return <span>{action.replace(/_/g, ' ')} {entity_type}</span>;
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
