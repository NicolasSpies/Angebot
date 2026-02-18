import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileCheck, ExternalLink, Briefcase, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const PortalReviewsPage = () => {
    const { t } = useI18n();
    const { portalData } = useOutletContext();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const highlightedId = searchParams.get('id');

    const reviews = portalData?.reviews || [];

    // Group reviews by project
    const groupedReviews = reviews.reduce((acc, review) => {
        const projectName = review.project_name || 'Other';
        if (!acc[projectName]) acc[projectName] = [];
        acc[projectName].push(review);
        return acc;
    }, {});

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">{t('portal.reviews.title')} & Feedback</h1>
                <p className="text-[var(--text-secondary)] mt-1 font-medium text-lg">Review your deliverables and provide feedback for your projects.</p>
            </div>

            {Object.keys(groupedReviews).length > 0 ? Object.entries(groupedReviews).map(([projectName, projectReviews]) => (
                <div key={projectName} className="space-y-5">
                    <div className="flex items-center gap-3 px-1 border-l-4 border-[var(--primary)] pl-4">
                        <Briefcase size={20} className="text-[var(--primary)]" />
                        <h2 className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">{projectName}</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {projectReviews.map(review => {
                            const isHighlighted = highlightedId === review.id.toString();
                            const revisionsUsed = review.revisions_used || 0;
                            const reviewLimit = review.review_limit || 3;

                            return (
                                <Card
                                    key={review.id}
                                    className={`p-6 transition-all border-[var(--border-subtle)] hover:shadow-xl group bg-white shadow-sm ${isHighlighted ? 'ring-2 ring-[var(--warning)] border-transparent bg-amber-50/20' : ''
                                        }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${review.status === 'approved' ? 'bg-green-50 text-green-500' :
                                                    review.status === 'changes_requested' ? 'bg-amber-50 text-amber-500' :
                                                        'bg-blue-50 text-blue-500'
                                                }`}>
                                                <FileCheck size={28} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h3 className="font-black text-[18px] text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                                                    {review.title || `Review for ${projectName}`}
                                                </h3>
                                                <div className="flex items-center gap-4">
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${review.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            review.status === 'changes_requested' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {review.status === 'approved' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                        {t(`portal.reviews.status.${review.status}`)}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight bg-[var(--bg-app)] px-2 py-0.5 rounded-md">
                                                        Version {review.latest_version || 1}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                                                        Revision {revisionsUsed}/{reviewLimit}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                                                <Clock size={14} />
                                                {new Date(review.updated_at || review.created_at).toLocaleDateString()}
                                            </div>

                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="gap-2 rounded-full font-black px-6 py-2.5 shadow-lg shadow-[var(--primary)]/20"
                                                onClick={() => navigate(`${review.token}`)}
                                            >
                                                Open Review
                                                <ExternalLink size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )) : (
                <div className="py-24 text-center bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] border-dashed">
                    <div className="w-20 h-20 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)]">
                        <FileCheck size={32} />
                    </div>
                    <h3 className="text-xl font-black text-[var(--text-main)]">No reviews found</h3>
                    <p className="text-[var(--text-secondary)] max-w-sm mx-auto mt-2 font-medium">
                        When we have something for you to review, it will appear here.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PortalReviewsPage;
