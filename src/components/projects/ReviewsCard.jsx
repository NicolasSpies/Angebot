import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../../data/dataService';
import { FileText, Plus, ExternalLink, Calendar, ChevronRight, Upload, Link2, Clock } from 'lucide-react';
import StatusPill from '../ui/StatusPill';
import ReviewUploadModal from './ReviewUploadModal';
import { formatDate } from '../../utils/dateUtils';
import { Pencil } from 'lucide-react';

const ReviewsCard = ({ projectId }) => {
    const [reviews, setReviews] = useState([]);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    useEffect(() => {
        if (projectId) {
            loadReviews();
        }
    }, [projectId]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const [reviewsData, projectData] = await Promise.all([
                dataService.getProjectReviews(projectId),
                dataService.getProject(projectId)
            ]);
            setReviews(reviewsData);
            setProject(projectData);
        } catch (error) {
            console.error('Failed to load project reviews or project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLimit = async (newLimit) => {
        try {
            await dataService.updateProject(projectId, { review_limit: newLimit });
            setProject(prev => ({ ...prev, review_limit: newLimit }));
        } catch (error) {
            console.error('Failed to update limit:', error);
        }
    };

    return (
        <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText size={18} className="text-[var(--text-secondary)]" />
                        <h3 className="font-bold text-[15px] text-[var(--text-main)]">Reviews</h3>
                    </div>
                    {project && (
                        <div className="flex items-center gap-2 group/limit">
                            <p className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                                Revisions: {project.revisions_used || 0} /
                            </p>
                            <input
                                type="text"
                                value={project.review_limit === null ? '' : project.review_limit}
                                placeholder="3"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const num = val === '' ? null : parseInt(val.replace(/\D/g, ''));
                                    setProject({ ...project, review_limit: num });
                                }}
                                onBlur={() => handleUpdateLimit(project.review_limit)}
                                className="w-8 bg-transparent border-none p-0 focus:ring-0 font-black text-[var(--text-main)] text-[11px] text-center"
                            />
                            <Pencil size={10} className="text-[var(--text-muted)] opacity-0 group-hover/limit:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>
                <button
                    className={`btn-secondary btn-sm gap-1.5 ${(project?.review_limit ?? 3) !== null && project?.revisions_used >= (project?.review_limit ?? 3) && (reviews.length === 0 || reviews[0].status !== 'approved')
                        ? 'opacity-50 cursor-not-allowed grayscale'
                        : ''
                        }`}
                    onClick={() => {
                        const limit = project?.review_limit ?? 3;
                        if (project?.revisions_used >= limit && (reviews.length === 0 || reviews[0].status !== 'approved')) {
                            alert('Review limit reached. Please contact support or upgrade your plan.');
                            return;
                        }
                        setIsUploadModalOpen(true);
                    }}
                    title={(project?.review_limit ?? 3) !== null && project?.revisions_used >= (project?.review_limit ?? 3) && (reviews.length === 0 || reviews[0].status !== 'approved') ? 'Review limit reached' : ''}
                >
                    <Upload size={14} />
                    <span>{(project?.review_limit ?? 3) !== null && project?.revisions_used >= (project?.review_limit ?? 3) && (reviews.length === 0 || reviews[0].status !== 'approved') ? 'Limit Reached' : 'Upload New'}</span>
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary)]"></div>
                </div>
            ) : reviews.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center px-4">
                    <div className="w-12 h-12 bg-[var(--bg-app)] rounded-full flex items-center justify-center mb-3">
                        <FileText size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] font-medium">No reviews yet</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">Upload a PDF to start the client review process.</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-3">
                    {reviews.map((review) => (
                        <div key={review.id} className="group p-4 border border-[var(--border-subtle)] rounded-[var(--radius-lg)] hover:border-[var(--border-medium)] bg-[var(--bg-surface)] transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-[14px] text-[var(--text-main)] truncate">{review.title || 'Untitled Review'}</h4>
                                        {review.unread_count > 0 && (
                                            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full shadow-sm">
                                                {review.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusPill status={review.status} />
                                        {(review.version_number !== null && review.version_number !== undefined) && (
                                            <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-app)] px-2 py-0.5 rounded uppercase tracking-tight">v{review.version_number}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest leading-none mb-1">Usage</p>
                                    <p className="text-[13px] font-bold text-[var(--text-main)]">{review.revisions_used || 0} / {review.review_limit ?? 3}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                                <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-medium">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        <span>Updated {formatDate(review.updated_at)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/review/${review.token}`;
                                            navigator.clipboard.writeText(url);
                                            // Optional: show toast
                                        }}
                                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--bg-app)] rounded-md transition-all"
                                        title="Copy Public Link"
                                    >
                                        <Link2 size={16} />
                                    </button>
                                    <Link
                                        to={`/reviews/${review.token}`}
                                        className="btn-primary btn-xs px-3 py-1.5 rounded-md"
                                    >
                                        Open Review
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ReviewUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                projectId={projectId}
                onUploadSuccess={loadReviews}
            />
        </div>
    );
};

export default ReviewsCard;
