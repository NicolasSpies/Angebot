import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../../data/dataService';
import { FileText, Plus, ExternalLink, Calendar, ChevronRight, Upload, Link2, Clock, Trash2, Pencil } from 'lucide-react';
import StatusPill from '../ui/StatusPill';
import ReviewUploadModal from './ReviewUploadModal';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'react-hot-toast';

const ReviewsCard = ({ projectId }) => {
    const [reviews, setReviews] = useState([]);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [isDeleteReviewDialogOpen, setIsDeleteReviewDialogOpen] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState(null);

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

    const handleDeleteReviewClick = (review) => {
        setReviewToDelete(review);
        setIsDeleteReviewDialogOpen(true);
    };

    const confirmDeleteReview = async () => {
        if (!reviewToDelete) return;
        try {
            await dataService.deleteReview(reviewToDelete.id);
            toast.success('Review moved to trash');
            loadReviews();
        } catch (error) {
            console.error('Failed to delete review:', error);
            toast.error('Failed to delete review');
        } finally {
            setIsDeleteReviewDialogOpen(false);
            setReviewToDelete(null);
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
                </div>
                <button
                    className={`btn-secondary btn-sm gap-1.5 ${(project?.review_limit ?? 3) !== null && project?.revisions_used >= (project?.review_limit ?? 3) && (reviews.length === 0 || reviews[0].status !== 'approved')
                        ? 'opacity-50 cursor-not-allowed grayscale'
                        : ''
                        }`}
                    onClick={() => {
                        const limit = project?.review_limit ?? 3;
                        if (project?.revisions_used >= limit && (reviews.length === 0 || reviews[0].status !== 'approved')) {
                            toast.error('Review limit reached.');
                            return;
                        }
                        setUploadTitle('');
                        setIsUploadModalOpen(true);
                    }}
                    title={(project?.review_limit ?? 3) !== null && project?.revisions_used >= (project?.review_limit ?? 3) && (reviews.length === 0 || reviews[0].status !== 'approved') ? 'Review limit reached' : ''}
                >
                    <Upload size={14} />
                    <span>Upload New Review</span>
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
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-1">Revision Usage</p>
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${(review.revisions_used || 0) >= (review.review_limit || 3) ? 'bg-red-50 border-red-200 text-red-600' :
                                        (review.revisions_used || 0) >= (review.review_limit || 3) * 0.6 ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                            'bg-emerald-50 border-emerald-200 text-emerald-600'
                                        }`}>
                                        <span className="text-[12px]">{review.revisions_used || 0}</span>
                                        <span className="opacity-40">/</span>
                                        <span className="text-[12px]">{review.review_limit || 3}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                                <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-medium">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        <span>{formatDate(review.updated_at)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            setUploadTitle(review.title);
                                            setIsUploadModalOpen(true);
                                        }}
                                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--bg-app)] rounded-md transition-all"
                                        title="Upload New Version"
                                    >
                                        <Upload size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/review/${review.token}`;
                                            navigator.clipboard.writeText(url);
                                        }}
                                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--bg-app)] rounded-md transition-all"
                                        title="Copy Public Link"
                                    >
                                        <Link2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteReviewClick(review)}
                                        className="p-1.5 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                        title="Move to Trash"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <Link
                                        to={`/reviews/${review.token}`}
                                        className="btn-primary btn-xs px-3 py-1.5 rounded-md ml-1"
                                    >
                                        Open
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
                initialTitle={uploadTitle}
            />

            <ConfirmationDialog
                isOpen={isDeleteReviewDialogOpen}
                onClose={() => setIsDeleteReviewDialogOpen(false)}
                onConfirm={confirmDeleteReview}
                title="Move Review to Trash"
                message={`Are you sure you want to move "${reviewToDelete?.title || 'this review'}" to the trash?`}
                confirmText="Move to Trash"
                isDestructive={true}
            />
        </div>
    );
};

export default ReviewsCard;
