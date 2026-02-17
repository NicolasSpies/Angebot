import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import {
    FileText, Search, Filter, ArrowRight, Clock, User, Briefcase,
    Link as LinkIcon, List, LayoutGrid
} from 'lucide-react';
import StatusPill from '../components/ui/StatusPill';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate, formatTime } from '../utils/dateUtils';
import ListPageToolbar from '../components/layout/ListPageToolbar';
import Button from '../components/ui/Button';
import { toast } from 'react-hot-toast';

const ReviewsPage = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState('list');

    const REVIEW_STATUS_OPTIONS = [
        { value: 'all', label: 'All', color: 'var(--primary)' },
        { value: 'pending', label: 'Pending', color: '#94a3b8' },
        { value: 'in_review', label: 'In Review', color: '#3b82f6' },
        { value: 'feedback', label: 'Feedback', color: '#f59e0b' },
        { value: 'approved', label: 'Approved', color: '#10b981' }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await dataService.getReviews();
            if (data && data.error) {
                setError(data.error);
            } else {
                setReviews(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to load reviews:', error);
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    const filteredReviews = reviews.filter(r => {
        const matchesSearch =
            r.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.title?.toLowerCase().includes(searchTerm.toLowerCase());

        // Status matching logic
        let currentStatus = (r.status || '').toLowerCase();
        if (currentStatus === 'changes_requested') currentStatus = 'feedback';

        const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="page-container fade-in">
            <ListPageToolbar
                searchProps={{
                    value: searchTerm,
                    onChange: setSearchTerm,
                    placeholder: "Search reviews..."
                }}
                filters={
                    <div className="flex flex-wrap bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                        {REVIEW_STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setFilterStatus(opt.value)}
                                className={`
                                    flex items-center gap-2 px-4 h-[32px] rounded-lg text-[12px] font-bold transition-all whitespace-nowrap
                                    ${filterStatus === opt.value
                                        ? 'text-white shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-white/50'}
                                `}
                                style={filterStatus === opt.value ? {
                                    backgroundColor: opt.color,
                                } : {}}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                }
                actions={null}
            />

            <div className="h-px bg-[var(--border-subtle)] mb-8" />

            <div className="card p-0 overflow-hidden shadow-sm border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-[16px] font-bold text-[var(--text-main)]">Error loading reviews</h3>
                        <p className="text-[14px] text-[var(--text-secondary)] mt-1 mb-6">{error}</p>
                        <button onClick={loadData} className="btn-primary">Retry</button>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-[16px] font-bold text-[var(--text-main)]">No reviews found</h3>
                        <p className="text-[14px] text-[var(--text-secondary)] mt-1">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-app)]/50 border-b border-[var(--border-subtle)]">
                                <th className="text-left px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Project</th>
                                <th className="text-left px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Review Title</th>
                                <th className="text-left px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                                <th className="text-center px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Revisions</th>
                                <th className="text-left px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Last Updated</th>
                                <th className="px-6 py-3.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {filteredReviews.map((review) => (
                                <tr key={review.id} className="hover:bg-[var(--bg-app)]/30 transition-colors group">
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] text-[11px] font-bold">
                                                {review.project_name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <Link to={`/projects/${review.project_id}`} className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                                                {review.project_name}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <Link
                                            to={`/reviews/${review.token}`}
                                            className="flex items-center gap-2 group/title"
                                        >
                                            <span className="text-[13px] font-semibold text-[var(--text-main)] group-hover/title:text-[var(--primary)] transition-colors">{review.title || 'Untitled Review'}</span>
                                            {review.unread_count > 0 && (
                                                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full shadow-sm">
                                                    {review.unread_count}
                                                </span>
                                            )}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <StatusPill status={review.status} hideWaitingOn={true} />
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${(review.revisions_used || 0) >= (review.review_limit || 3) ? 'bg-red-50 border-red-200 text-red-600' :
                                            (review.revisions_used || 0) >= (review.review_limit || 3) * 0.6 ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                                'bg-emerald-50 border-emerald-200 text-emerald-600'
                                            }`}>
                                            <span className="text-[12px]">{review.revisions_used || 0}</span>
                                            <span className="opacity-40">/</span>
                                            <span className="text-[12px]">{review.review_limit || 3}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-semibold text-[var(--text-main)]">
                                                {formatDate(review.updated_at)}
                                            </span>
                                            <span className="text-[10px] text-[var(--text-muted)]">
                                                {formatTime(review.updated_at)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <a
                                                href={`${window.location.origin}/review/${review.token}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-secondary)] transition-colors"
                                                title="Open Public Review"
                                            >
                                                <LinkIcon size={14} />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ReviewsPage;
