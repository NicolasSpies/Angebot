import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { FileText, Search, Filter, ArrowRight, Clock, User, Briefcase } from 'lucide-react';
import StatusPill from '../components/ui/StatusPill';
import { Link } from 'react-router-dom';

const ReviewsPage = () => {
    const { t } = useI18n();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await dataService.getReviews();
            setReviews(data);
        } catch (error) {
            console.error('Failed to load reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredReviews = reviews.filter(r =>
        r.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.current_status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] mb-1">Reviews</h1>
                    <p className="text-[13px] text-[var(--text-secondary)]">Manage and track all project review processes.</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search by project or status..."
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[14px] outline-none focus:border-[var(--primary)] transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-secondary gap-2">
                    <Filter size={18} />
                    <span>Filter</span>
                </button>
            </div>

            {/* Reviews Table/List */}
            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
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
                            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-subtle)]">
                                <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] w-[40%]">Project</th>
                                <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Version</th>
                                <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                                <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Created</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {filteredReviews.map((review) => (
                                <tr key={review.id} className="hover:bg-[var(--bg-app)]/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link to={`/projects/${review.project_id}`} className="flex items-center gap-3 group">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] text-[12px] font-bold">
                                                {review.project_name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-[14px] font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">{review.project_name}</span>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[13px] font-medium px-2 py-1 bg-[var(--bg-app)] rounded-md">v{review.version_number}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusPill status={review.current_status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] text-[var(--text-main)]">{new Date(review.created_at).toLocaleDateString()}</span>
                                            <span className="text-[11px] text-[var(--text-muted)]">{new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            to={`/reviews/${review.id}`}
                                            className="inline-flex items-center gap-2 text-[12px] font-bold text-[var(--primary)] hover:underline"
                                        >
                                            View Details
                                            <ArrowRight size={14} />
                                        </Link>
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
