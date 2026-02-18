import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import {
    MessageSquare,
    CheckCircle2,
    Clock,
    User,
    ChevronDown,
    ChevronUp,
    Trash2,
    Highlighter,
    Strikethrough
} from 'lucide-react';

const ReviewSidebar = ({ comments = [], activeVersion, onCommentClick, onResolveComment, highlightedCommentId }) => {
    const { t } = useI18n();
    // Group comments by page
    const groupedComments = (comments || []).reduce((acc, comment) => {
        const page = comment.page_number || 1;
        if (!acc[page]) acc[page] = [];
        acc[page].push(comment);
        return acc;
    }, {});

    const sortedPages = Object.keys(groupedComments).sort((a, b) => a - b);

    return (
        <div className="w-80 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col h-full shadow-sm">
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/30">
                <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                    <MessageSquare size={18} className="text-[var(--primary)]" />
                    {t('portal.reviews.comments')}
                    <span className="ml-auto bg-[var(--bg-app)] text-[var(--text-secondary)] text-[11px] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] font-bold">
                        {comments?.length || 0}
                    </span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {sortedPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-12 h-12 bg-[var(--bg-app)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-4">
                            <MessageSquare size={24} />
                        </div>
                        <p className="text-[13px] text-[var(--text-secondary)] font-medium">{t('public_review.no_comments')}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('public_review.click_to_add')}</p>
                    </div>
                ) : (
                    sortedPages.map(page => (
                        <div key={page} className="border-b border-[var(--border-subtle)]">
                            <div className="px-4 py-2 bg-[var(--bg-app)]/50 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-between">
                                Page {page}
                                <span className="text-[var(--text-muted)]">{groupedComments[page].length}</span>
                            </div>
                            <div className="divide-y divide-[var(--border-subtle)]">
                                {groupedComments[page].map(comment => (
                                    <div
                                        key={comment.id}
                                        id={`comment-${comment.id}`}
                                        onClick={() => onCommentClick(comment)}
                                        className={`p-4 hover:bg-[var(--bg-app)] transition-all cursor-pointer group relative ${highlightedCommentId === comment.id
                                            ? 'bg-orange-50 ring-2 ring-orange-200 ring-inset shadow-inner'
                                            : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-[12px]">
                                                {comment.type === 'highlight' ? <Highlighter size={14} /> :
                                                    comment.type === 'strike' ? <Strikethrough size={14} /> :
                                                        <MessageSquare size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-[13px] font-bold text-[var(--text-main)] truncate">
                                                        {comment.author_name || t('public_review.anonymous')}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[13px] text-[var(--text-secondary)] leading-snug break-words">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onResolveComment(comment.id);
                                                }}
                                                className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-red-500 flex items-center gap-1.5 bg-[var(--bg-app)] px-2 py-1 rounded border border-[var(--border-subtle)]"
                                            >
                                                <Trash2 size={12} />
                                                {t('common.delete')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-app)]/10 text-[11px] text-[var(--text-muted)] font-medium flex items-center justify-center gap-2">
                <Clock size={12} />
                {t('public_review.auto_saving')}
            </div>
        </div>
    );
};

export default ReviewSidebar;
