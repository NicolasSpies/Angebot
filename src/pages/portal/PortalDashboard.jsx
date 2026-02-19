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

    // Simplified Portal Dashboard: No Recent Activity
    // Removed according to requirements

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

            {/* B. Support Overview (Refined Full-Width Design) */}
            {portalData?.support?.length > 0 && (
                <section className="space-y-4">
                    {portalData.support.map(acc => (
                        <Card
                            key={acc.id}
                            className="p-8 bg-gradient-to-br from-[#6366f1] to-[#4338ca] text-white border-none shadow-xl shadow-indigo-500/10"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
                                        <Clock size={14} />
                                        Live Status: {acc.package_name}
                                    </div>
                                    <h2 className="text-3xl font-black">
                                        Your Support Account
                                    </h2>
                                    <p className="text-white/80 font-medium">Reliable assistance whenever you need it.</p>
                                </div>

                                <div className="flex gap-8 md:gap-12">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-tight">
                                            {acc.is_pay_as_you_go ? "Month's Usage" : "Remaining Balance"}
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <div className="text-4xl font-black tabular-nums">
                                                {acc.is_pay_as_you_go ?
                                                    `${String(Math.floor((acc.monthly_hours || 0))).padStart(2, '0')}:${String(Math.round(((acc.monthly_hours || 0) % 1) * 60)).padStart(2, '0')}` :
                                                    `${String(Math.floor(acc.balance_hours || 0)).padStart(2, '0')}:${String(Math.round(((acc.balance_hours || 0) % 1) * 60)).padStart(2, '0')}`
                                                }
                                            </div>
                                            <span className="text-sm font-black text-white/40 uppercase tracking-tighter">hh:mm</span>
                                        </div>
                                    </div>

                                    {acc.is_pay_as_you_go === 1 && acc.monthly_value_eur !== undefined && acc.monthly_value_eur > 0 && (
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-tight">
                                                Estimated Value
                                            </div>
                                            <div className="text-4xl font-black tabular-nums">
                                                {formatCurrency(acc.monthly_value_eur)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </section>
            )}

            <div className="grid grid-cols-1 gap-12">
                {/* C. Active Projects Section - Full Width List Layout */}
                <section className="space-y-6">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <Briefcase size={16} className="text-[var(--text-muted)]" />
                            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Active Projects</h3>
                        </div>
                        <button onClick={() => navigate('projects')} className="text-[11px] font-black text-[var(--primary)] uppercase hover:underline">View All</button>
                    </div>

                    <div className="space-y-4">
                        {activeProjects.length > 0 ? activeProjects.map((project, idx) => (
                            <Card
                                key={project.id}
                                className={`group overflow-hidden border-[var(--border-subtle)] hover:border-[var(--primary)]/30 hover:scale-[1.005] transition-all cursor-pointer shadow-sm bg-white ${idx === 0 ? 'p-8' : 'p-6'}`}
                                onClick={() => navigate(`projects/${project.id}`)}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className={`font-black text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors ${idx === 0 ? 'text-2xl' : 'text-xl'}`}>
                                                {project.name}
                                            </h4>
                                            <StatusPill status={project.status || 'todo'} />
                                        </div>
                                        {idx === 0 && project.offer_name && (
                                            <div className="text-sm font-bold text-[var(--text-muted)] flex items-center gap-2">
                                                <FileCheck size={14} />
                                                Based on: {project.offer_name}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:block text-right">
                                            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Status</div>
                                            <div className="text-sm font-bold text-[var(--text-main)] capitalize">{(project.status || 'todo').replace('_', ' ')}</div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-[var(--bg-app)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )) : (
                            <Card className="p-12 text-center bg-[var(--bg-app)]/30 border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] font-bold">
                                No active projects at the moment.
                            </Card>
                        )}
                    </div>
                </section>

                {/* D. Signed Agreements Section - Simplified List */}
                <section className="space-y-6">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <FileCheck size={16} className="text-[var(--text-muted)]" />
                            <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Your Agreements</h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {agreements.length > 0 ? agreements.map(offer => (
                            <Card key={offer.id} className="p-5 shadow-sm bg-white border-[var(--border-subtle)] flex items-center justify-between group hover:border-[var(--primary)]/20 transition-all">
                                <div className="space-y-1">
                                    <h4 className="font-black text-[15px] text-[var(--text-main)] truncate max-w-[150px]">{offer.offer_name}</h4>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-muted)]">
                                        <span>{formatCurrency(offer.total || 0)}</span>
                                        <span>•</span>
                                        <span>{new Date(offer.signed_at || offer.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full w-9 h-9 p-0 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-bg)]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(offer.id);
                                    }}
                                >
                                    <Download size={16} />
                                </Button>
                            </Card>
                        )) : (
                            <div className="col-span-full p-8 text-center bg-[var(--bg-app)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] font-bold text-sm">
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
