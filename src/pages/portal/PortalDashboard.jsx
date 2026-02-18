import React, { useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Briefcase, FileCheck, Clock, Download,
    CheckCircle2, AlertCircle, ArrowRight,
    Star, MessageSquare, FileText
} from 'lucide-react';
import StatusPill from '../../components/ui/StatusPill';
import { formatCurrency } from '../../utils/pricingEngine';

const PortalDashboard = () => {
    const { t } = useI18n();
    const { portalData, greetingName } = useOutletContext();
    const navigate = useNavigate();

    const activeProjects = useMemo(() =>
        portalData?.projects.filter(p => !['done', 'completed', 'cancelled'].includes(p.status.toLowerCase())) || [],
        [portalData]);

    const openReviews = useMemo(() =>
        portalData?.reviews.filter(r => r.status !== 'approved') || [],
        [portalData]);

    const agreements = portalData?.agreements || [];

    // Derive Recent Activity (Max 3 items)
    const recentActivity = useMemo(() => {
        const activities = [];

        // Signed Agreements
        agreements.forEach(a => {
            activities.push({
                id: `offer-${a.id}`,
                type: 'signed',
                icon: Star,
                iconColor: 'text-green-500',
                text: `${t('portal.activity.you_signed') || 'You signed'}: ${a.offer_name}`,
                date: new Date(a.signed_at || a.created_at)
            });
        });

        // Reviews with comments/updates
        portalData?.reviews?.forEach(r => {
            if (r.status === 'changes_requested') {
                activities.push({
                    id: `review-${r.id}`,
                    type: 'comment',
                    icon: MessageSquare,
                    iconColor: 'text-amber-500',
                    text: `${t('portal.activity.you_commented') || 'You commented on'}: ${r.title || r.project_name}`,
                    date: new Date(r.updated_at || r.created_at)
                });
            }
        });

        // Projects
        activeProjects.forEach(p => {
            if (p.status === 'in_progress') {
                activities.push({
                    id: `project-${p.id}`,
                    type: 'project',
                    icon: Briefcase,
                    iconColor: 'text-[var(--primary)]',
                    text: `Project moved to In Progress: ${p.name}`,
                    date: new Date(p.updated_at || p.created_at)
                });
            }
        });

        return activities
            .sort((a, b) => b.date - a.date)
            .slice(0, 3);
    }, [portalData, agreements, activeProjects, t]);

    const handleDownload = (offerId) => {
        window.open(`/api/offers/${offerId}/download`, '_blank');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Greeting */}
            <div>
                <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tight">
                    Hi {greetingName},
                </h1>
            </div>

            {/* A. Action Center (Most visually prominent) */}
            <section>
                {openReviews.length > 0 ? (
                    <Card
                        className="p-8 bg-gradient-to-br from-[var(--primary)] to-[#4f46e5] text-white border-none shadow-xl shadow-[var(--primary)]/20 cursor-pointer group hover:scale-[1.01] transition-all"
                        onClick={() => navigate('reviews')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest">
                                    <AlertCircle size={14} />
                                    Urgent Action
                                </div>
                                <h2 className="text-3xl font-black">
                                    {openReviews.length === 1 ? '1 review needs your feedback' : `${openReviews.length} reviews need your feedback`}
                                </h2>
                                <p className="text-white/80 font-medium">Click here to open the latest deliverables and provide feedback.</p>
                            </div>
                            <div className="hidden sm:flex w-16 h-16 bg-white/10 rounded-2xl items-center justify-center group-hover:bg-white/20 transition-colors">
                                <ArrowRight size={32} />
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="p-8 bg-[var(--bg-surface)] border-[var(--border-subtle)] border-dashed shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center">
                                <CheckCircle2 size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-main)]">All projects are on track.</h2>
                                <p className="text-[var(--text-secondary)] font-medium">We'll notify you as soon as there's something to review.</p>
                            </div>
                        </div>
                    </Card>
                )}
            </section>

            {/* B. Optional: Recent Activity (Small Section) */}
            {recentActivity.length > 0 && (
                <section className="space-y-4">
                    <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1">Recent Activity</h3>
                    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                        {recentActivity.map(activity => (
                            <div key={activity.id} className="p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg bg-[var(--bg-app)] ${activity.iconColor}`}>
                                        <activity.icon size={16} />
                                    </div>
                                    <span className="text-[14px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors">
                                        {activity.text}
                                    </span>
                                </div>
                                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                                    {activity.date.toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* C. Active Projects Section */}
                <section className="space-y-5">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Active Projects</h3>
                        <button onClick={() => navigate('projects')} className="text-[11px] font-black text-[var(--primary)] uppercase hover:underline">View All</button>
                    </div>
                    <div className="space-y-3">
                        {activeProjects.length > 0 ? activeProjects.map(project => (
                            <Card
                                key={project.id}
                                className="p-5 hover:border-[var(--primary)]/30 hover:scale-[1.02] transition-all cursor-pointer group shadow-sm bg-white"
                                onClick={() => navigate(`projects/${project.id}`)}
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="font-black text-[17px] text-[var(--text-main)] leading-tight group-hover:text-[var(--primary)] transition-colors">
                                        {project.name}
                                    </h4>
                                    <StatusPill status={project.status || 'todo'} />
                                </div>
                            </Card>
                        )) : (
                            <div className="p-10 text-center bg-[var(--bg-app)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] font-bold text-sm">
                                No active projects.
                            </div>
                        )}
                    </div>
                </section>

                {/* D. Signed Agreements Section */}
                <section className="space-y-5">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Your Agreements</h3>
                    </div>
                    <div className="space-y-3">
                        {agreements.length > 0 ? agreements.map(offer => (
                            <Card key={offer.id} className="p-5 shadow-sm bg-white border-[var(--border-subtle)] flex items-center justify-between group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-green-500" />
                                        <h4 className="font-black text-[15px] text-[var(--text-main)]">{offer.offer_name}</h4>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-bold text-[var(--text-muted)]">
                                        <span>{formatCurrency(offer.total || 0)}</span>
                                        <div className="w-1 h-1 bg-[var(--border)] rounded-full" />
                                        <span>Signed {new Date(offer.signed_at || offer.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full w-10 h-10 p-0 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-bg)]"
                                    onClick={() => handleDownload(offer.id)}
                                >
                                    <Download size={18} />
                                </Button>
                            </Card>
                        )) : (
                            <div className="p-10 text-center bg-[var(--bg-app)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] font-bold text-sm">
                                No signed agreements yet.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PortalDashboard;
