import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Briefcase, Clock, FileText, ChevronLeft,
    ExternalLink, Download, FileCheck,
    ChevronRight, Star
} from 'lucide-react';
import StatusPill from '../../components/ui/StatusPill';
import { formatCurrency } from '../../utils/pricingEngine';

const PortalProjectDetailPage = () => {
    const { t } = useI18n();
    const { projectId } = useParams();
    const { portalData } = useOutletContext();
    const navigate = useNavigate();

    const project = portalData?.projects.find(p => p.id === parseInt(projectId));
    const projectReviews = portalData?.reviews.filter(r => r.project_id === parseInt(projectId)) || [];

    if (!project) {
        return (
            <div className="text-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-subtle)]">
                <Briefcase size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-20" />
                <p className="text-xl font-black text-[var(--text-main)]">Project not found.</p>
                <Button variant="ghost" onClick={() => navigate('../projects')} className="mt-4 font-black uppercase tracking-widest text-[var(--primary)] text-[11px]">
                    <ChevronLeft size={16} className="mr-2" />
                    Back to Projects
                </Button>
            </div>
        );
    }

    const handleDownload = (offerId) => {
        window.open(`/api/offers/${offerId}/download`, '_blank');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Nav & Header */}
            <div className="space-y-6">
                <button
                    onClick={() => navigate('../projects')}
                    className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Projects
                </button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tight">{project.name}</h1>
                            <StatusPill status={project.status} />
                        </div>
                        {project.deadline && (
                            <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-tight">
                                <Clock size={16} className="text-[var(--primary)]" />
                                Est. Completion: {new Date(project.deadline).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Content: Deliverables */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileCheck size={18} className="text-[var(--primary)]" />
                            Deliverables & Reviews
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {projectReviews.length > 0 ? projectReviews.map(review => (
                            <Card
                                key={review.id}
                                className="p-6 hover:shadow-xl transition-all border-[var(--border-subtle)] group bg-white shadow-sm cursor-pointer"
                                onClick={() => navigate(`../reviews/${review.token}`)}
                            >
                                <div className="flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${review.status === 'approved' ? 'bg-green-50 text-green-500' :
                                            review.status === 'changes_requested' ? 'bg-amber-50 text-amber-500' :
                                                'bg-blue-50 text-blue-500'
                                            }`}>
                                            <FileCheck size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-[18px] text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                                                {review.title || 'Creative Review'}
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <StatusPill status={review.status} />
                                                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight bg-[var(--bg-app)] px-2 py-0.5 rounded-md">
                                                    Version {review.latest_version || 1}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-3 text-[var(--primary)] font-black text-[11px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                                        Open Review
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </Card>
                        )) : (
                            <div className="py-20 text-center bg-[var(--bg-app)]/30 rounded-3xl border border-dashed border-[var(--border-subtle)]">
                                <FileCheck size={32} className="mx-auto text-[var(--text-muted)] mb-4 opacity-30" />
                                <p className="text-[var(--text-main)] font-black">No active reviews</p>
                                <p className="text-[var(--text-secondary)] text-sm mt-1 max-w-[240px] mx-auto">Once designs are ready for your feedback, they will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Details */}
                <div className="space-y-8">
                    <section className="space-y-4">
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1">Agreement Detail</h3>
                        {project.offer_id ? (
                            <Card className="p-6 bg-white border-[var(--border-subtle)] shadow-sm space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                        <Star size={24} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Signed Offer</p>
                                        <p className="font-black text-[var(--text-main)] text-lg truncate">{project.offer_name}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pb-2">
                                    <div>
                                        <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total</p>
                                        <p className="font-black text-[var(--text-main)] text-xl">{formatCurrency(project.offer_total || 0)}</p>
                                    </div>
                                    <div className="flex flex-col items-end justify-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all shadow-md active:translate-y-0.5"
                                            onClick={() => handleDownload(project.offer_id)}
                                        >
                                            <Download size={14} />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <div className="p-8 text-center bg-[var(--bg-app)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)]">
                                <FileText size={24} className="mx-auto text-[var(--text-muted)] mb-2 opacity-30" />
                                <p className="text-xs text-[var(--text-muted)] font-bold italic">No linked agreement</p>
                            </div>
                        )}
                    </section>

                    <section className="space-y-4 bg-[var(--primary-bg)]/30 p-6 rounded-3xl border border-[var(--primary)]/10">
                        <h3 className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock size={14} />
                            Project Insight
                        </h3>
                        <p className="text-[13px] text-[var(--text-secondary)] font-medium leading-relaxed">
                            This project is currently in the <span className="font-black text-[var(--text-main)] underline decoration-[var(--primary)] decoration-2 underline-offset-4">{project.status?.toUpperCase()}</span> stage.
                            We prioritize quality above all else and look forward to your feedback on the latest deliverables.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PortalProjectDetailPage;
