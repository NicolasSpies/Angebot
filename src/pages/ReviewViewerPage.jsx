import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
    Plus,
    X,
    Maximize,
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Highlighter,
    Strikethrough,
    CheckCircle2,
    Calendar,
    Reply,
    MoreVertical,
    Send,
    ChevronDown
} from 'lucide-react';
import { dataService } from '../data/dataService';
import Button from '../components/ui/Button';

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
    </div>
);

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const ReviewViewerPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [review, setReview] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pdf, setPdf] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.5);
    const [activeTool, setActiveTool] = useState('select'); // 'select', 'comment', 'highlight', 'strike'
    const [selectedComment, setSelectedComment] = useState(null);
    const [newCommentPos, setNewCommentPos] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState(null);
    const [tempRect, setTempRect] = useState(null);

    // Refs
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);

    // Load Review Data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch specific review version
                const currentReview = await dataService.getReview(id);

                if (currentReview.error) {
                    console.error('Review not found:', currentReview.error);
                    navigate('/reviews');
                    return;
                }

                setReview(currentReview);

                // Load Comments
                const commentData = await dataService.getReviewComments(id);
                setComments(Array.isArray(commentData) ? commentData : []);

                // Load PDF
                if (currentReview.file_url) {
                    const loadingTask = pdfjsLib.getDocument(currentReview.file_url);
                    const pdfDocument = await loadingTask.promise;
                    setPdf(pdfDocument);
                    setNumPages(pdfDocument.numPages);
                }

            } catch (err) {
                console.error('Failed to load review:', err);
                // Optionally show an error state instead of redirecting
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    // Render PDF Page
    const renderPage = useCallback(async (pageNum, currentScale) => {
        if (!pdf || !canvasRef.current) return;

        // Cancel previous render task if any
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
        }

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentScale });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            renderTaskRef.current = page.render(renderContext);
            await renderTaskRef.current.promise;
        } catch (err) {
            if (err.name !== 'RenderingCancelledException') {
                console.error('Render error:', err);
            }
        }
    }, [pdf]);

    useEffect(() => {
        renderPage(currentPage, scale);
    }, [currentPage, scale, renderPage]);

    // Handle Clicks for Annotations
    const handleMouseDown = (e) => {
        if (activeTool === 'select' || activeTool === 'comment' || !pdf) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setTempRect({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !drawStart) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setTempRect({
            x: Math.min(x, drawStart.x),
            y: Math.min(y, drawStart.y),
            width: Math.abs(x - drawStart.x),
            height: Math.abs(y - drawStart.y)
        });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !tempRect) return;

        if (tempRect.width > 0.5 && tempRect.height > 0.5) {
            setNewCommentPos({
                x: tempRect.x + tempRect.width / 2,
                y: tempRect.y + tempRect.height / 2,
                width: tempRect.width,
                height: tempRect.height
            });
        }

        setIsDrawing(false);
        setDrawStart(null);
        setTempRect(null);
    };

    const handleCanvasClick = (e) => {
        if (activeTool !== 'comment' || !pdf) return;

        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setNewCommentPos({ x, y, width: null, height: null });
        setSelectedComment(null);
    };

    const handleSaveComment = async (parentId = null) => {
        const textToSave = parentId ? replyText : commentText;
        if (!textToSave.trim()) return;

        // If parentId is provided, find the parent comment to inherit coordinates
        const parentComment = parentId ? comments.find(c => c.id === parentId) : null;

        try {
            const newComment = await dataService.createReviewComment(id, {
                page_number: parentComment ? parentComment.page_number : currentPage,
                x: parentComment ? parentComment.x : newCommentPos.x,
                y: parentComment ? parentComment.y : newCommentPos.y,
                width: parentComment ? parentComment.width : newCommentPos.width,
                height: parentComment ? parentComment.height : newCommentPos.height,
                type: parentId ? 'reply' : (activeTool === 'comment' ? 'comment' : activeTool),
                content: textToSave,
                created_by: 'System',
                parent_id: parentId
            });

            setComments([...comments, newComment]);
            if (parentId) {
                setReplyText('');
                setReplyingTo(null);
            } else {
                setCommentText('');
                setNewCommentPos(null);
                setActiveTool('select');
            }
        } catch (err) {
            console.error('Failed to save comment:', err);
        }
    };

    const handleResolveComment = async (commentId) => {
        try {
            await dataService.resolveReviewComment(commentId, 'System');
            setComments(comments.map(c =>
                c.id === commentId || c.parent_id === commentId
                    ? { ...c, is_resolved: 1 }
                    : c
            ));
        } catch (err) {
            console.error('Failed to resolve comment:', err);
        }
    };

    const handleConvertToTask = async (commentId) => {
        try {
            await dataService.convertCommentToTask(commentId);
            setComments(comments.map(c =>
                c.id === commentId || c.parent_id === commentId
                    ? { ...c, is_resolved: 1 }
                    : c
            ));
            // Show some success feedback if needed
        } catch (err) {
            console.error('Failed to convert comment to task:', err);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await dataService.deleteReviewComment(commentId);
            setComments(comments.filter(c => c.id !== commentId));
            if (selectedComment?.id === commentId) setSelectedComment(null);
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="flex h-screen bg-[var(--bg-app)] overflow-hidden">
            {/* Sidebar - Comments */}
            <div className="w-[320px] border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col">
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <h2 className="font-bold text-[16px]">Comments</h2>
                    <span className="bg-[var(--bg-app)] text-[var(--text-secondary)] text-[11px] px-2 py-0.5 rounded-full font-bold">
                        {comments.length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare size={32} className="mx-auto text-[var(--text-muted)] mb-3 opacity-20" />
                            <p className="text-[13px] text-[var(--text-secondary)]">No comments yet</p>
                        </div>
                    ) : (
                        comments.filter(c => !c.parent_id).map(comment => (
                            <div
                                key={comment.id}
                                className={`rounded-[var(--radius-md)] border overflow-hidden transition-all
                                    ${selectedComment?.id === comment.id
                                        ? 'border-[var(--primary)]'
                                        : 'border-[var(--border-subtle)]'}
                                    ${comment.is_resolved ? 'opacity-60 bg-[var(--bg-app)]' : 'bg-[var(--bg-surface)]'}
                                `}
                                onClick={() => {
                                    setSelectedComment(comment);
                                    setCurrentPage(comment.page_number);
                                }}
                            >
                                <div className={`p-3 ${selectedComment?.id === comment.id ? 'bg-[var(--primary-light)]/5' : ''}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-wider">Page {comment.page_number}</span>
                                            {comment.is_resolved && (
                                                <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase">
                                                    <CheckCircle2 size={10} /> Resolved
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {!comment.is_resolved && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleConvertToTask(comment.id); }}
                                                        className="text-[var(--text-muted)] hover:text-[var(--primary)] p-1"
                                                        title="Convert to Task"
                                                    >
                                                        <Calendar size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleResolveComment(comment.id); }}
                                                        className="text-[var(--text-muted)] hover:text-green-600 p-1"
                                                        title="Resolve"
                                                    >
                                                        <CheckCircle2 size={12} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                                                className="text-[var(--text-muted)] hover:text-[var(--danger)] p-1"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[13px] text-[var(--text-main)] line-clamp-3">{comment.content}</p>
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center text-[white] text-[9px] font-bold">
                                                {comment.author_name ? comment.author_name.substring(0, 2).toUpperCase() : 'JS'}
                                            </div>
                                            <span className="text-[11px] text-[var(--text-secondary)]">{comment.author_name || 'System'} • {new Date(comment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setReplyingTo(comment.id); setSelectedComment(comment); }}
                                            className="text-[var(--primary)] text-[11px] font-bold hover:underline"
                                        >
                                            Reply
                                        </button>
                                    </div>
                                </div>

                                {/* Replies */}
                                <div className="bg-[var(--bg-app)]/50 border-t border-[var(--border-subtle)] space-y-px">
                                    {comments.filter(reply => reply.parent_id === comment.id).map(reply => (
                                        <div key={reply.id} className="p-2 ml-4 border-l border-[var(--border-subtle)]">
                                            <p className="text-[12px] text-[var(--text-main)] mb-1">{reply.content}</p>
                                            <div className="flex items-center gap-2 opacity-70">
                                                <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                                                    {reply.author_name || reply.created_by || 'System'} • {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {replyingTo === comment.id && (
                                        <div className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]" onClick={e => e.stopPropagation()}>
                                            <textarea
                                                autoFocus
                                                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-2 text-[12px] min-h-[60px] focus:outline-none focus:border-[var(--primary)]"
                                                placeholder="Write a reply..."
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <Button size="xs" variant="secondary" className="flex-1" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                                <Button size="xs" className="flex-1" disabled={!replyText.trim()} onClick={() => handleSaveComment(comment.id)}>Send</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content - PDF Viewer */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Desktop Toolbar */}
                <div className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between px-4 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-[var(--bg-app)] rounded-full text-[var(--text-secondary)]"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="font-bold text-[15px] text-[var(--text-main)] truncate max-w-[200px]">
                                {review?.project_name} - V{review?.version}
                            </h1>
                            <p className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-tight">Reviewing Document</p>
                        </div>
                    </div>

                    <div className="flex items-center bg-[var(--bg-app)] p-1 rounded-full border border-[var(--border-subtle)]">
                        <button
                            onClick={() => setActiveTool('select')}
                            className={`p-1.5 rounded-full transition-all ${activeTool === 'select' ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
                        >
                            <Maximize size={18} />
                        </button>
                        <button
                            onClick={() => setActiveTool('comment')}
                            className={`p-1.5 rounded-full transition-all ${activeTool === 'comment' ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
                        >
                            <MessageSquare size={18} />
                        </button>
                        <button
                            onClick={() => setActiveTool('highlight')}
                            className={`p-1.5 rounded-full transition-all ${activeTool === 'highlight' ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
                            title="Highlight Region"
                        >
                            <Highlighter size={18} />
                        </button>
                        <button
                            onClick={() => setActiveTool('strike')}
                            className={`p-1.5 rounded-full transition-all ${activeTool === 'strike' ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
                            title="Strike Region"
                        >
                            <Strikethrough size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[var(--bg-app)] px-2 py-1 rounded-md border border-[var(--border-subtle)] mr-2">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="text-[var(--text-secondary)] hover:text-[var(--text-main)]"><ZoomOut size={16} /></button>
                            <span className="text-[12px] font-bold min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="text-[var(--text-secondary)] hover:text-[var(--text-main)]"><ZoomIn size={16} /></button>
                        </div>
                        <div className="flex items-center gap-2 bg-[var(--bg-app)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="disabled:opacity-30"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[12px] font-bold">{currentPage} / {numPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                                disabled={currentPage === numPages}
                                className="disabled:opacity-30"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* PDF Container */}
                <div
                    ref={containerRef}
                    className={`relative shadow-2xl bg-white select-none ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
                    style={{ width: 'fit-content', height: 'fit-content' }}
                    onClick={handleCanvasClick}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                >
                    <canvas ref={canvasRef} />

                    {/* Annotation Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Existing Annotations */}
                        {comments.filter(c => c.page_number === currentPage).map(comment => (
                            <React.Fragment key={comment.id}>
                                {/* Region Annotations */}
                                {(comment.type === 'highlight' || comment.type === 'strike') && (
                                    <div
                                        className={`absolute pointer-events-auto cursor-pointer transition-opacity hover:opacity-80
                                                ${comment.type === 'highlight' ? 'bg-yellow-400/30' : 'bg-red-400/30 strike-line'}
                                                ${selectedComment?.id === comment.id ? 'ring-2 ring-[var(--primary)] opacity-100' : 'opacity-60'}
                                            `}
                                        style={{
                                            left: `${comment.x - (comment.width / 2)}%`,
                                            top: `${comment.y - (comment.height / 2)}%`,
                                            width: `${comment.width}%`,
                                            height: `${comment.height}%`
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedComment(comment);
                                            setNewCommentPos(null);
                                        }}
                                    >
                                        {comment.type === 'strike' && (
                                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-600 -translate-y-1/2" />
                                        )}
                                    </div>
                                )}

                                {/* Point Annotations */}
                                <div
                                    className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto transition-all transform hover:scale-125
                                            ${selectedComment?.id === comment.id
                                            ? 'bg-[var(--primary)] text-white shadow-lg z-20 scale-110'
                                            : (comment.is_resolved
                                                ? 'bg-green-100 text-green-600 border-2 border-green-600 shadow-sm z-10'
                                                : 'bg-white text-[var(--primary)] border-2 border-[var(--primary)] shadow-md z-10')}
                                        `}
                                    style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedComment(comment);
                                        setNewCommentPos(null);
                                    }}
                                >
                                    {comment.is_resolved ? <CheckCircle2 size={12} /> : <MessageSquare size={12} />}
                                </div>
                            </React.Fragment>
                        ))}

                        {/* Temporary Rect while drawing */}
                        {tempRect && (
                            <div
                                className={`absolute border-2 border-dashed ${activeTool === 'highlight' ? 'bg-yellow-400/20 border-yellow-500' : 'bg-red-400/20 border-red-500'}`}
                                style={{
                                    left: `${tempRect.x}%`,
                                    top: `${tempRect.y}%`,
                                    width: `${tempRect.width}%`,
                                    height: `${tempRect.height}%`
                                }}
                            />
                        )}

                        {/* New Comment Placeholder */}
                        {newCommentPos && (
                            <div
                                className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg z-30 animate-in zoom-in-50 duration-200"
                                style={{ left: `${newCommentPos.x}%`, top: `${newCommentPos.y}%` }}
                            >
                                <Plus size={14} />
                            </div>
                        )}
                    </div>

                    {/* Comment Input Popover */}
                    {newCommentPos && (
                        <div
                            className="absolute z-40 bg-[var(--bg-surface)] w-[280px] rounded-[var(--radius-lg)] shadow-2xl border border-[var(--border-strong)] p-3 animate-in fade-in slide-in-from-top-2 duration-200"
                            style={{
                                left: `${newCommentPos.x}%`,
                                top: `calc(${newCommentPos.y}% + 20px)`,
                                transform: 'translateX(-50%)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[12px] font-bold text-[var(--text-main)]">Add Comment</span>
                                <button onClick={() => setNewCommentPos(null)} className="text-[var(--text-muted)]"><X size={14} /></button>
                            </div>
                            <textarea
                                autoFocus
                                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-2 text-[13px] min-h-[80px] focus:outline-none focus:border-[var(--primary)]"
                                placeholder="Write your feedback..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                            />
                            <div className="flex gap-2 mt-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setNewCommentPos(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    disabled={!commentText.trim()}
                                    onClick={handleSaveComment}
                                >
                                    Post
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Selected Comment Tooltip */}
                    {selectedComment && !newCommentPos && (
                        <div
                            className="absolute z-40 bg-[var(--bg-surface)] w-[260px] rounded-[var(--radius-lg)] shadow-xl border border-[var(--border-strong)] p-3 animate-in fade-in duration-200"
                            style={{
                                left: `${selectedComment.x}%`,
                                top: `calc(${selectedComment.y}% + 20px)`,
                                transform: 'translateX(-50%)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-[10px] font-bold">
                                    {(selectedComment.author_name || selectedComment.created_by || 'S').substring(0, 1).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-[var(--text-main)] truncate">{selectedComment.author_name || selectedComment.created_by || 'System'}</p>
                                    <p className="text-[10px] text-[var(--text-secondary)]">{new Date(selectedComment.created_at).toLocaleDateString()}</p>
                                </div>
                                {selectedComment.is_resolved && <CheckCircle2 size={14} className="text-green-600" />}
                            </div>

                            <p className="text-[13px] text-[var(--text-main)] mb-3">{selectedComment.content}</p>

                            <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
                                {!selectedComment.is_resolved ? (
                                    <>
                                        <button
                                            onClick={() => setReplyingTo(selectedComment.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--primary-light)]/10 transition-colors"
                                        >
                                            <Reply size={12} /> Reply
                                        </button>
                                        <button
                                            onClick={() => handleResolveComment(selectedComment.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-bold text-green-600 hover:bg-green-50 transition-colors"
                                        >
                                            <CheckCircle2 size={12} /> Resolve
                                        </button>
                                    </>
                                ) : (
                                    <p className="flex-1 text-center text-[11px] text-[var(--text-muted)] font-medium py-1">Resolution confirmed</p>
                                )}
                                <button
                                    onClick={() => setSelectedComment(null)}
                                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewViewerPage;
