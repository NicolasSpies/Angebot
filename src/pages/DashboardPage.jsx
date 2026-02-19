import React, { useState, useEffect } from 'react';
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
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        summary: { draftCount: 0, pendingCount: 0, signedCount: 0, winRate: 0, avgDealSize: 0 },
        financials: { totalOpenValue: 0, forecastPending: 0, profitEstimate: 0, signedRevenue: 0, momGrowth: 0 },
        performance: { monthlyPerformance: [], avgOfferValueMonth: 0, signedThisMonthCount: 0, avgMonthlyIncome: 0 },
        alerts: { expiringSoonCount: 0, oldDraftsCount: 0, expiringOffers: [] },
        analytics: { topCategories: [], topClients: [], recentActivity: [] },
        projects: { activeProjectCount: 0, overdueProjectCount: 0, projectsByStatus: [] }
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            if (!stats.summary.draftCount && !stats.analytics.recentActivity.length) {
                // Optimization: Only show loading if we have absolutely no data
                // But since we have defaults, we can often just show those
            }
            try {
                const data = await dataService.getDashboardStats();
                if (data && !data.error) {
                    setStats(prev => ({ ...prev, ...data }));
                }
            } catch (err) {
                console.error('Failed to load dashboard stats', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboard();

        // Perform non-blocking repair in background after first render
        // This prevents the "DB change -> Vite reload" storm at startup
        setTimeout(() => {
            dataService.repairLinks().catch(err => console.warn('Background repair failed', err));
        }, 5000);
    }, []);

    // Non-blocking loading
    // if (isLoading) return <div className="page-container flex items-center justify-center min-h-[400px]">Loading dashboard...</div>;

    const { summary, financials, performance, alerts, analytics, projects } = stats;

    const totalSignedRevenue = analytics.topServicesByRevenue?.reduce((acc, s) => acc + s.revenue, 0) || 0;
    const totalSignedCount = analytics.topServicesByCount?.reduce((acc, s) => acc + s.count, 0) || 0;

    const ProgressBar = ({ percentage }) => (
        <div className="w-full h-1 rounded-full bg-[var(--bg-subtle)] overflow-hidden mt-2">
            <div
                className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
        </div>
    );

    return (
        <div className="page-container pb-24 max-w-[1600px] mx-auto pt-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm">
                    <div className="p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] w-fit mb-4">
                        <TrendingUp size={20} />
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums leading-none mb-2">
                        {performance ? formatCurrency(performance.revenueThisMonth || 0) : '...'}
                    </p>
                    <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Revenue This Month</p>
                </Card>

                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm">
                    <div className="p-2 rounded-lg bg-[var(--warning-bg)]/30 text-[var(--warning)] w-fit mb-4">
                        <Clock size={20} />
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums leading-none mb-2">{summary ? summary.pendingCount : '...'}</p>
                    <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Sent</p>
                </Card>

                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm">
                    <div className="p-2 rounded-lg bg-[var(--primary-light)]/30 text-[var(--primary)] w-fit mb-4">
                        <Briefcase size={20} />
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums leading-none mb-2">{projects ? projects.activeProjectCount : '...'}</p>
                    <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Projects in Progress</p>
                </Card>

                <Card padding="1.5rem" className={`border border-[var(--border-subtle)] shadow-sm ${projects?.overdueProjectCount > 0 ? 'bg-red-50/50 border-red-100' : ''}`}>
                    <div className={`p-2 rounded-lg w-fit mb-4 ${projects?.overdueProjectCount > 0 ? 'bg-red-100 text-red-600' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <p className={`text-[28px] font-black tabular-nums leading-none mb-2 ${projects?.overdueProjectCount > 0 ? 'text-red-600' : 'text-[var(--text-main)]'}`}>
                        {projects ? projects.overdueProjectCount : '...'}
                    </p>
                    <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Overdue Projects</p>
                </Card>

                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm">
                    <div className="p-2 rounded-lg bg-[var(--success-bg)]/30 text-[var(--success)] w-fit mb-4">
                        <CheckCircle size={20} />
                    </div>
                    <p className="text-[28px] font-black text-[var(--text-main)] tabular-nums leading-none mb-2">
                        {summary ? summary.totalSignedServicesCount : '...'}
                    </p>
                    <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Signed Services Total</p>
                </Card>
            </div>

            {/* Top Signed Services Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm">
                    <h3 className="text-[14px] font-bold text-[var(--text-main)] mb-6">Top 5 Signed Services by Revenue</h3>
                    <div className="space-y-5">
                        {analytics.topServicesByRevenue?.length > 0 ? (
                            analytics.topServicesByRevenue.map((service, i) => (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[13px] font-medium text-[var(--text-main)]">{service.name}</span>
                                        <span className="text-[13px] font-bold text-[var(--text-main)] tabular-nums">{formatCurrency(service.revenue)}</span>
                                    </div>
                                    <ProgressBar percentage={(service.revenue / financials.signedRevenue) * 100} />
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-[var(--text-muted)] text-[13px]">No signed services yet</div>
                        )}
                    </div>
                </Card>

                <Card padding="1.5rem" className="border border-[var(--border-subtle)] shadow-sm">
                    <h3 className="text-[14px] font-bold text-[var(--text-main)] mb-6">Top 5 Signed Services by Count</h3>
                    <div className="space-y-5">
                        {analytics.topServicesByCount?.length > 0 ? (
                            analytics.topServicesByCount.map((service, i) => (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[13px] font-medium text-[var(--text-main)]">{service.name}</span>
                                        <span className="text-[13px] font-bold text-[var(--text-main)] tabular-nums">{service.count}</span>
                                    </div>
                                    <ProgressBar percentage={(service.count / summary.totalSignedServicesCount) * 100} />
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-[var(--text-muted)] text-[13px]">No signed services yet</div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Charts & Financials */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                            <span className="text-[12px] font-bold uppercase tracking-wider">Forecast Open</span>
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

            <Card padding="0" className="border border-[var(--border-subtle)] shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-3">
                        <Activity size={20} className="text-[var(--text-muted)]" />
                        <h3 className="text-[16px] font-extrabold text-[var(--text-main)]">Recent Activity</h3>
                    </div>
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
                                if (act.entity_type === 'offer') navigate(`/offer/preview/${act.entity_id}`);
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
                                            {act.created_at ? new Date(act.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
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
