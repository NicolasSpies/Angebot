import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import {
    Plus, Clock, CheckCircle, FileText, TrendingUp, AlertTriangle,
    Users, Briefcase, Zap, Calendar
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const DashboardPage = () => {
    const { t } = useI18n();
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await dataService.getDashboardStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load dashboard stats', err);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    if (isLoading || !stats) return <div className="page-container">Loading...</div>;

    const { summary, financials, performance, alerts, analytics, projects } = stats;

    return (
        <div className="page-container">
            <div className="flex justify-between items-center mb-4">
                <h1 className="page-title" style={{ marginBottom: 0 }}>{t('nav.dashboard')}</h1>
                <Link to="/offer/new">
                    <Button>
                        <Plus size={18} style={{ marginRight: '0.5rem' }} />
                        New Offer
                    </Button>
                </Link>
            </div>

            {/* TOP ROW: Summary Status */}
            <div className="grid grid-4 mb-4">
                <Card padding="1rem" className="flex items-center gap-4">
                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: '12px' }}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-muted uppercase">Drafts</p>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{summary.draftCount}</h2>
                    </div>
                </Card>
                <Card padding="1rem" className="flex items-center gap-4">
                    <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '12px', borderRadius: '12px' }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-muted uppercase">Pending</p>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{summary.pendingCount}</h2>
                    </div>
                </Card>
                <Card padding="1rem" className="flex items-center gap-4">
                    <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px', borderRadius: '12px' }}>
                        <CheckCircle size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-muted uppercase">Signed</p>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{summary.signedCount}</h2>
                    </div>
                </Card>
                <Card padding="1rem" className="flex items-center gap-4">
                    <div style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '12px', borderRadius: '12px' }}>
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-muted uppercase">Active Projects</p>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{projects?.activeProjectCount || 0}</h2>
                    </div>
                </Card>
            </div>

            {/* SECOND ROW: Chart & Financials Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Performance</h3>
                        <Badge variant="primary">Yearly</Badge>
                    </div>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performance.monthlyPerformance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Bar dataKey="total" name="Revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="grid grid-2" style={{ alignContent: 'start' }}>
                    <Card padding="1rem">
                        <p className="text-muted font-bold uppercase" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Open Value</p>
                        <h4 style={{ fontSize: '1.25rem', margin: 0 }}>{formatCurrency(financials.totalOpenValue)}</h4>
                    </Card>
                    <Card padding="1rem">
                        <p className="text-muted font-bold uppercase" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Forecast</p>
                        <h4 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary)' }}>{formatCurrency(financials.forecastPending)}</h4>
                    </Card>
                    <Card padding="1rem">
                        <p className="text-muted font-bold uppercase" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Avg Offer</p>
                        <h4 style={{ fontSize: '1.25rem', margin: 0 }}>{formatCurrency(performance.avgOfferValueMonth)}</h4>
                    </Card>
                    <Card padding="1rem">
                        <p className="text-muted font-bold uppercase" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Profit Est.</p>
                        <h4 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--success)' }}>{formatCurrency(financials.profitEstimate)}</h4>
                    </Card>
                    <Card padding="1rem" style={{ gridColumn: 'span 2' }}>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-secondary">Signed This Month</span>
                            <span className="font-bold">{performance.signedThisMonthCount}</span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* THIRD ROW: Advanced Analytics */}
            <div className="grid grid-3 mb-4">
                <Card title="Critical Alerts">
                    <h4 className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: 'var(--danger)' }}>
                        <AlertTriangle size={16} /> Critical Alerts
                    </h4>
                    <div className="flex flex-column gap-2">
                        {alerts.expiringSoonCount > 0 && (
                            <div style={{ background: 'var(--danger-bg)', padding: '0.75rem', borderRadius: '8px' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold" style={{ color: 'var(--danger-text)' }}>Expiring Soon</span>
                                    <Badge variant="danger">{alerts.expiringSoonCount}</Badge>
                                </div>
                            </div>
                        )}
                        <div style={{ background: 'var(--warning-bg)', padding: '0.75rem', borderRadius: '8px' }}>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold" style={{ color: 'var(--warning-text)' }}>Old Drafts</span>
                                <Badge variant="warning">{alerts.oldDraftsCount}</Badge>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h4 className="flex items-center gap-2 text-sm font-bold mb-4">
                        <Zap size={16} color="var(--warning)" /> Top Categories
                    </h4>
                    <div className="flex flex-column gap-2">
                        {analytics.topCategories.slice(0, 4).map(cat => (
                            <div key={cat.category} className="flex justify-between text-sm">
                                <span className="text-secondary">{cat.category}</span>
                                <span className="font-bold">{formatCurrency(cat.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <h4 className="flex items-center gap-2 text-sm font-bold mb-4">
                        <Users size={16} color="var(--primary)" /> Top Clients
                    </h4>
                    <div className="flex flex-column gap-2">
                        {analytics.topClients.slice(0, 4).map(client => (
                            <div key={client.company_name} className="flex justify-between text-sm">
                                <span className="text-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.company_name}</span>
                                <span className="font-bold">{formatCurrency(client.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* FOURTH ROW: Activity Log */}
            <Card>
                <h4 className="flex items-center gap-2 text-sm font-bold mb-4">
                    <Calendar size={16} /> Recent Activity
                </h4>
                <div className="grid grid-2">
                    {analytics.recentActivity.map((act, i) => (
                        <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            <span className="text-sm">{act.text}</span>
                            <span className="text-xs text-muted">{new Date(act.date).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default DashboardPage;
