import React from 'react';
import {
    MessageSquare,
    CheckCircle2,
    Clock,
    User,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

const ReviewSidebar = ({ comments, activeVersion, onCommentClick, onResolveComment }) => {
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
                    Annotations
                    <span className="ml-auto bg-[var(--bg-app)] text-[var(--text-secondary)] text-[11px] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] font-bold">
                        {comments.length}
                    </span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {sortedPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-12 h-12 bg-[var(--bg-app)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-4">
                            <MessageSquare size={24} />
                        </div>
                        <p className="text-[13px] text-[var(--text-secondary)] font-medium">No comments yet</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">Click on the document to add one</p>
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
                                        onClick={() => onCommentClick(comment)}
                                        className="p-4 hover:bg-[var(--bg-app)] transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-[12px]">
                                                {comment.author_name?.[0] || <User size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-[13px] font-bold text-[var(--text-main)] truncate">
                                                        {comment.author_name || 'Anonymous'}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                                        12:45
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
                                                className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-green-600 flex items-center gap-1.5 bg-[var(--bg-app)] px-2 py-1 rounded border border-[var(--border-subtle)]"
                                            >
                                                <CheckCircle2 size={12} />
                                                Resolve
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
                Auto-saving changes...
            </div>
        </div>
    );
};

export default ReviewSidebar;
