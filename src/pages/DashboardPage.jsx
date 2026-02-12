import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate, Link } from 'react-router-dom';
import {
    Plus, Clock, CheckCircle, FileText, TrendingUp, AlertTriangle,
    Users, Briefcase, Zap, DollarSign, Calendar, Eye
} from 'lucide-react';

const DashboardPage = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
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

    if (isLoading || !stats) return <div className="page-container">Loading Dashboard...</div>;

    const { summary, financials, performance, alerts, analytics } = stats;

    return (
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div className="page-header">
                <h1 className="page-title">{t('nav.dashboard')}</h1>
                <Link to="/offer/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <Plus size={18} /> Quick Create Offer
                </Link>
            </div>

            {/* TOP ROW: Summary Status */}
            <div className="grid grid-3" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#F0EBFF', borderRadius: '14px', color: '#6C3CFE', display: 'flex', padding: '0.75rem' }}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>First Draft</p>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{summary.draftCount}</h2>
                    </div>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#FFF6E5', borderRadius: '14px', color: '#FFB547', display: 'flex', padding: '0.75rem' }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Pending</p>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{summary.pendingCount}</h2>
                    </div>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#E6FBF3', borderRadius: '14px', color: '#05CD99', display: 'flex', padding: '0.75rem' }}>
                        <CheckCircle size={20} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Signed</p>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{summary.signedCount}</h2>
                    </div>
                </div>
            </div>

            {/* SECOND ROW: Chart & Financials Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Chart */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="var(--primary)" /> Monthly Performance
                    </h3>
                    <div style={{ height: '300px', width: '100%', fontSize: '0.75rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performance.monthlyPerformance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Bar dataKey="total" name="Revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Small Financial Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignContent: 'start' }}>
                    <div className="card" style={{ padding: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Open Value</p>
                        <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{formatCurrency(financials.totalOpenValue)}</h4>
                    </div>
                    <div className="card" style={{ padding: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Revenue Forecast</p>
                        <h4 style={{ fontSize: '1.1rem', margin: 0, color: '#6C3CFE' }}>{formatCurrency(financials.forecastPending)}</h4>
                    </div>
                    <div className="card" style={{ padding: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Avg Offer Value</p>
                        <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{formatCurrency(performance.avgOfferValueMonth)}</h4>
                    </div>
                    <div className="card" style={{ padding: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Signed this Month</p>
                        <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{performance.signedThisMonthCount}</h4>
                    </div>
                    <div className="card" style={{ padding: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Profit Estimate</p>
                        <h4 style={{ fontSize: '1.1rem', margin: 0, color: '#05CD99' }}>{formatCurrency(financials.profitEstimate)}</h4>
                    </div>
                    <div className="card" style={{ padding: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Avg Monthly Income</p>
                        <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{formatCurrency(performance.avgMonthlyIncome)}</h4>
                    </div>
                </div>
            </div>

            {/* THIRD ROW: Advanced Analytics */}
            <div className="grid grid-3" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Expiring / Alerts */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Critical Alerts
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ p: '0.75rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fee2e2', padding: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: alerts.expiringOffers?.length > 0 ? '0.5rem' : 0 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Expiring within 7 days</span>
                                <span style={{ fontWeight: 700, color: '#b91c1c' }}>{alerts.expiringSoonCount}</span>
                            </div>
                            {alerts.expiringOffers?.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {alerts.expiringOffers.map(o => (
                                        <Link key={o.id} to={`/offer/preview/${o.id}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', textDecoration: 'none', color: '#7f1d1d', background: 'rgba(255,255,255,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                                            <span>{o.company_name}</span>
                                            <span style={{ fontWeight: 600 }}>{new Date(o.due_date).toLocaleDateString()}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ p: '0.75rem', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Unsent Drafts {'>'} 3 days</span>
                                <span style={{ fontWeight: 700, color: '#92400e' }}>{alerts.oldDraftsCount}</span>
                            </div>
                        </div>
                        <div style={{ padding: '0.75rem' }}>
                            <h5 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payment Milestones</h5>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>No upcoming milestones today.</p>
                        </div>
                    </div>
                </div>

                {/* Top Categories & Presets */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={16} color="#f59e0b" /> Insights
                    </h4>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Top Service Categories</h5>
                        {analytics.topCategories.map(cat => (
                            <div key={cat.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <span>{cat.category}</span>
                                <span style={{ fontWeight: 600 }}>{formatCurrency(cat.revenue)}</span>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h5 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Favorite Presets</h5>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <button className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Web Starter</button>
                            <button className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>E-Commerce</button>
                            <button className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Social SEO</button>
                        </div>
                    </div>
                </div>

                {/* Top Clients */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={16} color="var(--primary)" /> Top Clients (YTD)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {analytics.topClients.map(client => (
                            <div key={client.company_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                <span style={{ fontWeight: 500 }}>{client.company_name}</span>
                                <span style={{ fontWeight: 700 }}>{formatCurrency(client.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FOURTH ROW: Activity Log */}
            <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} /> Recent Activity (Internal)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x.5rem 2rem' }}>
                    {analytics.recentActivity.map((act, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                            <span>{act.text}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(act.date).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
