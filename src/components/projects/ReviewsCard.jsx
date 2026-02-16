import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../../data/dataService';
import { FileText, Plus, ExternalLink, Calendar, ChevronRight, Upload, Link2 } from 'lucide-react';
import StatusPill from '../ui/StatusPill';
import ReviewUploadModal from './ReviewUploadModal';

const ReviewsCard = ({ projectId }) => {
    const [reviews, setReviews] = useState([]);
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
            const data = await dataService.getProjectReviews(projectId);
            setReviews(data);
        } catch (error) {
            console.error('Failed to load project reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[var(--text-secondary)]" />
                    <h3 className="font-bold text-[15px] text-[var(--text-main)]">Reviews</h3>
                </div>
                <button
                    className="btn-secondary btn-sm gap-1.5"
                    onClick={() => setIsUploadModalOpen(true)}
                >
                    <Upload size={14} />
                    <span>Upload New</span>
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
                        <div key={review.id} className="group p-3 border border-[var(--border-subtle)] rounded-[var(--radius-md)] hover:border-[var(--border-medium)] transition-all block">
                            <div className="flex items-center justify-between gap-3">
                                <Link
                                    to={`/reviews/${review.id}`}
                                    className="flex-1 min-w-0"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[13px] font-bold text-[var(--text-main)] hover:text-[var(--primary)] transition-colors">Version {review.version_number}</span>
                                        <StatusPill status={review.current_status} />
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                                        <Calendar size={12} />
                                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-1">
                                    <Link
                                        to={`/reviews/${review.id}`}
                                        className="w-8 h-8 rounded-full bg-[var(--bg-app)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--primary)] hover:text-white transition-all"
                                    >
                                        <ChevronRight size={16} />
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
