import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, FileText, AlertTriangle, Plus, ArrowRight, Zap, Clock, CheckCircle, Briefcase, Calendar } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';

const DashboardPage = () => {
    const { t } = useI18n();
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
            // Artificial delay to show off the skeleton if needed, but for now just load
            // await new Promise(r => setTimeout(r, 800)); 
            try {
                const data = await dataService.getDashboardStats();
                if (data && !data.error) {
                    setStats(data);
                } else {
                    console.error('Dashboard data error:', data?.error);
                }
            } catch (err) {
                console.error('Failed to load dashboard stats', err);
            }
            setIsLoading(false);
        };
        loadDashboard();
    }, []);

    if (isLoading || !stats) return <div className="page-container">Loading...</div>;

    const { summary, financials, performance, alerts, analytics, projects } = stats;

    return (
        <div className="page-container" style={{ paddingBottom: '6rem' }}>
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tight mb-2">Workspace Intelligence</h1>
                    <p className="text-[15px] text-[var(--text-secondary)] font-medium">Analyzing your ecosystem's performance and financial velocity.</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="ghost" className="font-bold border-[var(--border)]" onClick={() => window.location.reload()}>
                        <Zap size={18} className="mr-2 text-[var(--primary)]" /> Resync Data
                    </Button>
                    <Link to="/offer/new">
                        <Button size="lg" className="shadow-2xl shadow-[var(--primary)]/20 px-8 font-extrabold">
                            <Plus size={20} className="mr-2" /> New Strategic Offer
                        </Button>
                    </Link>
                </div>
            </div>

            {/* TOP ROW: Summary Status */}
            <div className="grid grid-4 gap-6 mb-10">
                <Card padding="1.5rem" className="flex flex-column gap-5 border-[var(--border)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--primary)]/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shadow-sm">
                            <FileText size={24} />
                        </div>
                        <Badge variant="neutral" className="font-bold px-3">DRAFT</Badge>
                    </div>
                    <div>
                        <p className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-1">In-Progress Proposals</p>
                        <h2 className="text-3xl font-black text-[var(--text-main)]">{summary.draftCount}</h2>
                    </div>
                </Card>

                <Card padding="1.5rem" className="flex flex-column gap-5 border-[var(--border)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--warning)]/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--warning-bg)] text-[var(--warning)] flex items-center justify-center shadow-sm">
                            <Clock size={24} />
                        </div>
                        <Badge variant="warning" className="font-bold px-3">PENDING</Badge>
                    </div>
                    <div>
                        <p className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-1">Awaiting Client Approval</p>
                        <h2 className="text-3xl font-black text-[var(--text-main)]">{summary.pendingCount}</h2>
                    </div>
                </Card>

                <Card padding="1.5rem" className="flex flex-column gap-5 border-[var(--border)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--success)]/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center shadow-sm">
                            <CheckCircle size={24} />
                        </div>
                        <Badge variant="success" className="font-bold px-3">SUCCESS</Badge>
                    </div>
                    <div>
                        <p className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-1">Closed-Won Contracts</p>
                        <h2 className="text-3xl font-black text-[var(--text-main)]">{summary.signedCount}</h2>
                    </div>
                </Card>

                <Card padding="1.5rem" className="flex flex-column gap-5 border-[var(--border)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-slate-900/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-sm">
                            <Briefcase size={24} />
                        </div>
                        <Badge variant="primary" className="font-bold px-3">PRODUCTION</Badge>
                    </div>
                    <div>
                        <p className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-1">Current Active Engagements</p>
                        <h2 className="text-3xl font-black text-[var(--text-main)]">{projects?.activeProjectCount || 0}</h2>
                    </div>
                </Card>
            </div>

            {/* SECOND ROW: Chart & Financials Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                <Card padding="2rem" className="lg:col-span-2 shadow-sm border-[var(--border)]">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-[18px] font-black text-[var(--text-main)] tracking-tight">Revenue Dynamics</h3>
                            <p className="text-[13px] text-[var(--text-secondary)] font-medium mt-1">Global monthly revenue trends & forecasting</p>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="primary" className="px-4 py-1.5 shadow-sm font-bold">FISCAL YEAR 2024</Badge>
                        </div>
                    </div>
                    <div style={{ height: '320px', width: '100%', marginLeft: '-20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performance.monthlyPerformance}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} dy={15} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v / 1000}k`} dx={-10} />
                                <Tooltip
                                    cursor={{ fill: 'var(--primary-light)', opacity: 0.3 }}
                                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '16px', fontWeight: 'bold' }}
                                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                                />
                                <Bar dataKey="total" name="Revenue" fill="var(--primary)" radius={[8, 8, 2, 2]} barSize={42} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="flex flex-column gap-6">
                    <Card padding="1.5rem" className="bg-[var(--bg-main)]/50 border-dashed border-2 border-[var(--border)] shadow-none">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-white shadow-sm text-[var(--text-muted)]"><TrendingUp size={20} /></div>
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pt-1">Opportunity</span>
                        </div>
                        <p className="text-[12px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-1">Open Pipeline Value</p>
                        <h4 className="text-[22px] font-black text-[var(--text-main)] tabular-nums">{formatCurrency(financials.totalOpenValue)}</h4>
                    </Card>

                    <Card padding="1.5rem" className="bg-[var(--primary-light)]/50 border-2 border-[var(--primary)]/10 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"><Zap size={20} /></div>
                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest pt-1">Best Case</span>
                        </div>
                        <p className="text-[12px] font-extrabold text-[var(--primary)] uppercase tracking-wider mb-1">Forecasted Pending</p>
                        <h4 className="text-[22px] font-black text-[var(--primary)] tabular-nums">{formatCurrency(financials.forecastPending)}</h4>
                    </Card>

                    <Card padding="2rem" className="shadow-lg border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                        <div className="relative z-10 flex flex-column gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--success)] flex items-center justify-center text-white shadow-lg">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                                    <h4 className="text-[14px] font-bold">Signed This Month</h4>
                                </div>
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter tabular-nums">{performance.signedThisMonthCount}</h2>
                        </div>
                    </Card>
                </div>
            </div>

            {/* THIRD ROW: Advanced Analytics */}
            <div className="grid grid-3 gap-8 mb-10">
                <Card className="border-[var(--border)] shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)]">
                            <AlertTriangle size={20} />
                        </div>
                        <h3 className="text-[16px] font-black text-[var(--text-main)]">Operational Risk</h3>
                    </div>
                    <div className="space-y-4">
                        {projects?.overdueProjectCount > 0 && (
                            <div className="p-4 bg-[var(--danger-bg)]/50 border border-[var(--danger)]/10 rounded-2xl group hover:bg-[var(--danger-bg)] transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-[var(--danger)]">
                                            <AlertTriangle size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-extrabold text-[var(--text-main)]">Delivery Overdue</p>
                                            <p className="text-[11px] text-[var(--text-muted)] font-medium">Critical project deadlines missed</p>
                                        </div>
                                    </div>
                                    <Badge variant="danger" className="font-bold shadow-sm">{projects.overdueProjectCount}</Badge>
                                </div>
                            </div>
                        )}
                        {alerts.expiringSoonCount > 0 && (
                            <div className="p-4 bg-[var(--warning-bg)]/50 border border-[var(--warning)]/10 rounded-2xl group hover:bg-[var(--warning-bg)] transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-[var(--warning)]">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-extrabold text-[var(--text-main)]">Expiry Imminent</p>
                                            <p className="text-[11px] text-[var(--text-muted)] font-medium">Proposal validity ending soon</p>
                                        </div>
                                    </div>
                                    <Badge variant="warning" className="font-bold shadow-sm">{alerts.expiringSoonCount}</Badge>
                                </div>
                            </div>
                        )}
                        <div className="p-4 bg-slate-50 border border-[var(--border)] rounded-2xl group hover:bg-slate-100 transition-colors">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-500">
                                        <FileText size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-extrabold text-[var(--text-main)]">Draft Stagnation</p>
                                        <p className="text-[11px] text-[var(--text-muted)] font-medium">Aging inactive proposals</p>
                                    </div>
                                </div>
                                <Badge variant="neutral" className="font-bold shadow-sm">{alerts.oldDraftsCount}</Badge>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="border-[var(--border)] shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 rounded-xl bg-[var(--primary-light)] text-[var(--primary)]">
                            <Zap size={20} />
                        </div>
                        <h3 className="text-[16px] font-black text-[var(--text-main)]">Category Dominance</h3>
                    </div>
                    <div className="space-y-6">
                        {analytics.topCategories.slice(0, 4).map(cat => (
                            <div key={cat.category} className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[13px] font-extrabold text-[var(--text-main)]">{cat.category}</span>
                                    <span className="text-[13px] font-black text-[var(--primary)]">{formatCurrency(cat.revenue)}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-white shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark,var(--primary))] rounded-full shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                                        style={{ width: `${Math.min(100, (cat.revenue / financials.signedCount * 100) || 40)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="border-[var(--border)] shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                            <Users size={20} />
                        </div>
                        <h3 className="text-[16px] font-black text-[var(--text-main)]">Major Alliances</h3>
                    </div>
                    <div className="space-y-3">
                        {analytics.topClients.slice(0, 5).map(client => (
                            <div key={client.company_name} className="flex justify-between items-center p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-[var(--border)] transition-all group">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white text-[12px] font-black flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                        {client.company_name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-black text-[var(--text-main)] truncate mt-0.5">{client.company_name}</p>
                                        <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Key Account</p>
                                    </div>
                                </div>
                                <span className="text-[14px] font-black text-[var(--text-secondary)] tabular-nums">{formatCurrency(client.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* FOURTH ROW: Activity Log */}
            <Card padding="2rem" className="border-[var(--border)] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--success)] to-[var(--primary)] opacity-50" />
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-2xl">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <h3 className="text-[20px] font-black text-[var(--text-main)] tracking-tight">Ecosystem Activity</h3>
                            <p className="text-[14px] text-[var(--text-secondary)] font-medium">Chronological record of system-wide operations and events.</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="font-extrabold text-[var(--primary)] hover:bg-[var(--primary-light)] px-6">
                        Audit Full Workspace <ArrowRight size={16} className="ml-2" />
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
                    {analytics.recentActivity.map((act, i) => (
                        <div key={i} className="flex justify-between items-center py-5 border-b border-[var(--border)] last:border-0 group hover:bg-slate-50 px-4 -mx-4 rounded-xl transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] opacity-20 group-hover:opacity-100 group-hover:scale-125 transition-all shadow-[0_0_8px_rgba(124,58,237,0)] group-hover:shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
                                <span className="text-[15px] font-extrabold text-[var(--text-main)]">{act.text}</span>
                            </div>
                            <span className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] tabular-nums">{new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default DashboardPage;
