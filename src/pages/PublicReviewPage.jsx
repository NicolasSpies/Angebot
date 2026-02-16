import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Maximize2,
    MessageSquare,
    Highlighter,
    Strikethrough,
    Send,
    Plus,
    User,
    Mail,
    Reply,
    ShieldAlert,
    Download,
    FileText
} from 'lucide-react';
import { dataService } from '../data/dataService';
import Button from '../components/ui/Button';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const PublicReviewPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    // State
    const [review, setReview] = useState(null);
    const [selectedVersionId, setSelectedVersionId] = useState(null);
    const [pdf, setPdf] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.5);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([]);
    const [activeTool, setActiveTool] = useState('select');
    const [selectedComment, setSelectedComment] = useState(null);
    const [newCommentPos, setNewCommentPos] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [pinRequired, setPinRequired] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [verifiedPin, setVerifiedPin] = useState(null);
    const [settings, setSettings] = useState(null);

    // Identity State
    const [showIdentityModal, setShowIdentityModal] = useState(false);
    const [author, setAuthor] = useState({
        name: localStorage.getItem('review_author_name') || '',
        email: localStorage.getItem('review_author_email') || ''
    });

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);

    const loadReviewByToken = useCallback(async (tkn, p = null) => {
        setLoading(true);
        try {
            const url = p ? `/api/public/review/${tkn}?pin=${p}` : `/api/public/review/${tkn}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.pin_required) {
                setPinRequired(true);
                setReview(data);
                setLoading(false);
                return;
            }

            if (data.error) throw new Error(data.error);

            setReview(data);
            setSelectedVersionId(data.id);
            setPinRequired(false);
            setVerifiedPin(p);

            const commentData = await dataService.getPublicComments(data.id);
            setComments(Array.isArray(commentData) ? commentData : []);

            const loadingTask = pdfjsLib.getDocument(data.file_url);
            const pdfInstance = await loadingTask.promise;
            setPdf(pdfInstance);
            setNumPages(pdfInstance.numPages);
        } catch (err) {
            console.error('Failed to load review:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadVersionById = useCallback(async (versionId) => {
        setLoading(true);
        try {
            const version = await dataService.getReviewVersion(versionId);
            setReview(prev => ({ ...prev, ...version }));
            setSelectedVersionId(versionId);

            const commentData = await dataService.getPublicComments(versionId);
            setComments(Array.isArray(commentData) ? commentData : []);

            const loadingTask = pdfjsLib.getDocument(version.file_url);
            const pdfInstance = await loadingTask.promise;
            setPdf(pdfInstance);
            setNumPages(pdfInstance.numPages);
        } catch (err) {
            console.error('Failed to load version:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReviewByToken(token);
        dataService.getSettings().then(setSettings);
    }, [token, loadReviewByToken]);

    const handleVerifyPin = async (e) => {
        e.preventDefault();
        setPinError('');
        try {
            const res = await fetch(`/api/public/review/${token}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            const data = await res.json();
            if (data.success) {
                loadReviewByToken(token, pin);
            } else {
                setPinError('Invalid PIN code');
            }
        } catch (err) {
            setPinError('Validation failed');
        }
    };

    // Render Page
    const renderPage = useCallback(async (pageNum, currentScale) => {
        if (!pdf || !canvasRef.current) return;

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

            renderTaskRef.current = page.render({
                canvasContext: context,
                viewport: viewport
            });
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

    const handleMouseDown = (e) => {
        if (activeTool === 'select' || activeTool === 'comment' || !pdf || isReadOnly) return;

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
        if (activeTool !== 'comment' || !pdf || isReadOnly) return;

        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setNewCommentPos({ x, y, width: null, height: null });
        setSelectedComment(null);
    };

    const captureScreenshot = () => {
        if (!canvasRef.current) return null;
        try {
            // Quality 0.5 to keep file size small
            return canvasRef.current.toDataURL('image/jpeg', 0.5);
        } catch (err) {
            console.error('Failed to capture screenshot:', err);
            return null;
        }
    };

    const handleSaveComment = async (parentId = null) => {
        const textToSave = parentId ? replyText : commentText;
        if (!textToSave.trim()) return;

        // Find parent to inherit coordinates
        const parentComment = parentId ? comments.find(c => c.id === parentId) : null;

        // Check Identity
        if (!author.name || !author.email) {
            setShowIdentityModal(true);
            return;
        }

        try {
            const screenshot = parentId ? null : captureScreenshot();

            const newComment = await dataService.createPublicComment(selectedVersionId, {
                page_number: parentComment ? parentComment.page_number : currentPage,
                x: parentComment ? parentComment.x : newCommentPos.x,
                y: parentComment ? parentComment.y : newCommentPos.y,
                width: parentComment ? parentComment.width : newCommentPos.width,
                height: parentComment ? parentComment.height : newCommentPos.height,
                type: parentId ? 'reply' : (activeTool === 'comment' ? 'comment' : activeTool),
                content: textToSave,
                author_name: author.name,
                author_email: author.email,
                parent_id: parentId,
                screenshot: screenshot
            });

            setComments([...comments, newComment]);
            if (parentId) {
                setReplyText('');
                setReplyingTo(null);
            } else {
                setNewCommentPos(null);
                setCommentText('');
                setActiveTool('select');
            }
        } catch (err) {
            console.error('Failed to save comment:', err);
        }
    };

    const handleApprove = async () => {
        if (!author.name || !author.email) {
            setShowIdentityModal(true);
            return;
        }

        if (!window.confirm('Are you sure you want to approve this review version? This will close the review.')) return;

        try {
            await dataService.approveReview(selectedVersionId, author);
            alert('Review approved successfully!');
            loadVersionById(selectedVersionId);
        } catch (err) {
            console.error('Failed to approve:', err);
        }
    };

    const saveIdentity = (e) => {
        e.preventDefault();
        localStorage.setItem('review_author_name', author.name);
        localStorage.setItem('review_author_email', author.email);
        setShowIdentityModal(false);
        if (newCommentPos && commentText) {
            handleSaveComment();
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--bg-secondary)]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
    );

    const isCurrent = review?.id === review?.current_version_id;
    const isReadOnly = review?.status === 'approved' || !isCurrent;

    if (!review && !loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
            <X size={48} className="mb-4 opacity-50" />
            <h1 className="text-xl font-medium">Review Not Found or Closed</h1>
            <p>The link might be expired, incorrect, or the review has been completed.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-app)] overflow-hidden public-page">
            {isReadOnly && (
                <div className="bg-amber-500 text-white text-center text-[11px] font-black py-2.5 z-[100] flex items-center justify-center gap-2 uppercase tracking-[0.2em] shadow-lg">
                    <ShieldAlert size={14} />
                    {review?.status === 'approved' ? 'Final Review: Version Approved & Sealed' : 'Viewing Historical Version (Read Only)'}
                </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Public Header */}
                <header className="h-16 px-6 bg-white border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        {settings?.logo_url ? (
                            <img src={settings.logo_url} alt="Logo" className="h-8 w-auto grayscale" />
                        ) : (
                            <div className="h-8 w-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white shrink-0">
                                <FileText size={18} />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-[15px] font-extrabold text-[var(--text-main)] leading-none truncate max-w-[200px]">
                                    {review.project_name}
                                </h2>
                                <select
                                    className="bg-transparent border-none text-[13px] font-extrabold text-[var(--primary)] cursor-pointer outline-none"
                                    value={selectedVersionId}
                                    onChange={(e) => loadVersionById(parseInt(e.target.value))}
                                >
                                    {review.allVersions?.map(v => (
                                        <option key={v.id} value={v.id}>
                                            V{v.version_number} {v.id === review.current_version_id ? '(Current)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Project Document Review</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isReadOnly && (
                            <div className="flex items-center bg-[var(--bg-app)] rounded-full p-1 border border-[var(--border-subtle)]">
                                <button
                                    onClick={() => setActiveTool('select')}
                                    className={`p-2 rounded-full transition-all ${activeTool === 'select' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                                    title="Select"
                                >
                                    <Maximize2 size={18} />
                                </button>
                                <button
                                    onClick={() => setActiveTool('comment')}
                                    className={`p-2 rounded-full transition-all ${activeTool === 'comment' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                                    title="Add Comment"
                                >
                                    <MessageSquare size={18} />
                                </button>
                                <button
                                    onClick={() => setActiveTool('highlight')}
                                    className={`p-2 rounded-full transition-all ${activeTool === 'highlight' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                                    title="Highlight Region"
                                >
                                    <Highlighter size={18} />
                                </button>
                                <button
                                    onClick={() => setActiveTool('strike')}
                                    className={`p-2 rounded-full transition-all ${activeTool === 'strike' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                                    title="Strike Region"
                                >
                                    <Strikethrough size={18} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center bg-[var(--bg-app)] rounded-lg p-1 border border-[var(--border-subtle)] ml-4">
                            <button onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))} className="p-1 px-2 text-[var(--text-secondary)]">
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-xs font-bold px-2 min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(prev => Math.min(3, prev + 0.2))} className="p-1 px-2 text-[var(--text-secondary)]">
                                <ZoomIn size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-9"
                                onClick={() => setShowIdentityModal(true)}
                            >
                                <User size={14} className="mr-2" />
                                {author.name || 'Set Identity'}
                            </Button>

                            {review.status !== 'approved' && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="text-xs h-9"
                                    onClick={handleApprove}
                                >
                                    <CheckCircle2 size={14} className="mr-2" />
                                    Approve
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-9 w-9 p-0"
                                onClick={() => {
                                    a.href = review?.file_url;
                                    a.download = `review-${review.project_name}-v${review.version_number}.pdf`;
                                    a.click();
                                }}
                                title="Download PDF"
                            >
                                <Download size={16} />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Viewer Area */}
                <div className="flex-1 overflow-auto bg-[var(--bg-app)]/50 p-8 flex justify-center custom-scrollbar">
                    <div
                        className={`relative shadow-2xl bg-white select-none ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
                        ref={containerRef}
                        onClick={handleCanvasClick}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        style={{ width: 'fit-content', height: 'fit-content' }}
                    >
                        <canvas ref={canvasRef} />

                        {/* Annotation Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {comments.filter(c => c.page_number === currentPage).map(comment => (
                                <React.Fragment key={comment.id}>
                                    {/* Region Annotations */}
                                    {(comment.type === 'highlight' || comment.type === 'strike') && (
                                        <div
                                            className={`absolute pointer-events-auto cursor-pointer transition-opacity hover:opacity-100
                                                ${comment.type === 'highlight' ? 'bg-yellow-400/30' : 'bg-red-400/30'}
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

                                    {/* Point Marker */}
                                    <div
                                        className={`absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center rounded-full shadow-lg border-2 border-white pointer-events-auto cursor-pointer transition-transform hover:scale-110 
                                            ${selectedComment?.id === comment.id
                                                ? 'bg-[var(--primary)] scale-110 z-20'
                                                : (comment.is_resolved
                                                    ? 'bg-green-600 scale-100 z-10'
                                                    : 'bg-[var(--primary)]/80 scale-100 z-10'
                                                )}`}
                                        style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedComment(comment);
                                            setNewCommentPos(null);
                                        }}
                                    >
                                        {comment.is_resolved ? <CheckCircle2 size={12} className="text-white" /> : <MessageSquare size={12} className="text-white" />}
                                    </div>
                                </React.Fragment>
                            ))}

                            {/* Temp Drawing Rect */}
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
                                    className="absolute w-6 h-6 -ml-3 -mt-3 bg-[var(--primary)] flex items-center justify-center rounded-full shadow-lg border-2 border-white pointer-events-auto ring-4 ring-primary/20 z-30"
                                    style={{ left: `${newCommentPos.x}%`, top: `${newCommentPos.y}%` }}
                                >
                                    <Plus size={12} className="text-white" />

                                    {/* Input Popover */}
                                    <div className="absolute top-8 left-0 w-64 bg-white rounded-xl shadow-2xl border border-[var(--border-subtle)] p-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                        <textarea
                                            autoFocus
                                            className="w-full text-sm p-3 rounded-lg border border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none min-h-[100px] resize-none mb-3"
                                            placeholder="Write your feedback..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setNewCommentPos(null)}>Cancel</Button>
                                            <Button variant="primary" size="sm" onClick={handleSaveComment}>Post</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Selected Info Popover */}
                            {selectedComment && !newCommentPos && (
                                <div
                                    className="absolute z-40 bg-white w-[260px] rounded-xl shadow-xl border border-[var(--border-subtle)] p-4 pointer-events-auto"
                                    style={{
                                        left: `${selectedComment.x}%`,
                                        top: `calc(${selectedComment.y}% + 20px)`,
                                        transform: 'translateX(-50%)'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                                            {(selectedComment.author_name || 'U').substring(0, 1).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[var(--text-main)] truncate">{selectedComment.author_name || 'User'}</p>
                                            <p className="text-[10px] text-[var(--text-secondary)]">{new Date(selectedComment.created_at).toLocaleDateString()}</p>
                                        </div>
                                        {selectedComment.is_resolved && <CheckCircle2 size={16} className="text-green-600" />}
                                    </div>

                                    <p className="text-[13px] text-[var(--text-main)] mb-4 italic leading-relaxed">"{selectedComment.content}"</p>

                                    <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                                        {!selectedComment.is_resolved ? (
                                            <button
                                                onClick={() => setReplyingTo(selectedComment.id)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                                            >
                                                <Reply size={14} /> Reply
                                            </button>
                                        ) : (
                                            <p className="flex-1 text-center text-xs text-green-600 font-bold py-1">Issue Resolved</p>
                                        )}
                                        <button
                                            onClick={() => setSelectedComment(null)}
                                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Page Navigation */}
                <div className="h-14 bg-white border-t border-[var(--border-subtle)] flex items-center justify-center gap-4 shrink-0 shadow-lg z-10 font-bold">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-app)] disabled:opacity-30"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm">Page {currentPage} / {numPages}</span>
                    <button
                        disabled={currentPage === numPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-app)] disabled:opacity-30"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Sidebar */}
            <aside className="w-[340px] border-l border-[var(--border-subtle)] bg-white flex flex-col shrink-0">
                <div className="p-6 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-[var(--text-main)]">Comments</h3>
                        <span className="bg-[var(--bg-app)] text-[var(--text-secondary)] text-xs font-bold px-2 py-0.5 rounded-full">
                            {comments.length}
                        </span>
                    </div>
                    <button
                        onClick={async () => {
                            const res = await fetch(`/api/reviews/versions/${selectedVersionId}/export`);
                            const data = await res.json();
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `review-summary-${review.project_name}-v${review.version_number}.json`;
                            a.click();
                        }}
                        className="w-full btn-secondary btn-sm gap-2"
                    >
                        <FileText size={14} />
                        <span>Export Summary (JSON)</span>
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    {comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
                            <MessageSquare size={48} className="mb-4 text-[var(--text-muted)]" />
                            <p className="text-sm">No comments yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.filter(c => !c.parent_id).map(comment => (
                                <div
                                    key={comment.id}
                                    className={`rounded-xl border overflow-hidden transition-all
                                        ${currentPage === comment.page_number ? 'border-[var(--primary)] shadow-sm' : 'border-[var(--border-subtle)] hover:border-[var(--border-medium)]'}
                                        ${comment.is_resolved ? 'opacity-60 bg-[var(--bg-app)]' : 'bg-white'}
                                    `}
                                    onClick={() => {
                                        setCurrentPage(comment.page_number);
                                        setSelectedComment(comment);
                                    }}
                                >
                                    <div className={`p-4 ${currentPage === comment.page_number ? 'bg-[var(--primary)]/[0.02]' : ''}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-[var(--primary-light)]/20 text-[var(--primary)] rounded-full flex items-center justify-center text-xs font-bold">
                                                    {comment.author_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-main)] leading-none mb-1">
                                                        {comment.author_name || 'User'}
                                                    </p>
                                                    <p className="text-[10px] font-bold uppercase tracking-tight text-[var(--text-secondary)]">
                                                        P. {comment.page_number} • {comment.is_resolved ? 'Resolved' : 'Active'}
                                                    </p>
                                                </div>
                                            </div>
                                            {comment.is_resolved && <CheckCircle2 size={16} className="text-green-600" />}
                                        </div>
                                        <p className="text-[13px] text-[var(--text-main)] leading-relaxed italic mb-3">
                                            "{comment.content}"
                                        </p>
                                        {comment.screenshot_url && (
                                            <div className="mt-2 mb-3 rounded overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-app)]">
                                                <img
                                                    src={comment.screenshot_url}
                                                    alt="Context"
                                                    className="w-full h-auto cursor-zoom-in hover:opacity-90 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(comment.screenshot_url, '_blank');
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div className="flex justify-end">
                                            {!isReadOnly && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedComment(comment); setReplyingTo(comment.id); }}
                                                    className="text-[var(--primary)] text-xs font-bold hover:underline py-1"
                                                >
                                                    Reply
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    <div className="bg-[var(--bg-app)]/30 border-t border-[var(--border-subtle)] space-y-px">
                                        {comments.filter(reply => reply.parent_id === comment.id).map(reply => (
                                            <div key={reply.id} className="p-3 ml-4 border-l border-[var(--border-subtle)]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[11px] font-bold text-[var(--text-main)]">
                                                        {reply.author_name || reply.created_by || 'Team'}
                                                    </span>
                                                    <span className="text-[9px] text-[var(--text-secondary)] font-medium">
                                                        {new Date(reply.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-[var(--text-main)] leading-normal">{reply.content}</p>
                                            </div>
                                        ))}

                                        {replyingTo === comment.id && (
                                            <div className="p-4 bg-white border-t border-[var(--border-subtle)]" onClick={e => e.stopPropagation()}>
                                                <textarea
                                                    autoFocus
                                                    className="w-full text-xs p-3 rounded-lg border border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none min-h-[80px] resize-none mb-3"
                                                    placeholder="Write your reply..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                                    <Button variant="primary" size="sm" disabled={!replyText.trim()} onClick={() => handleSaveComment(comment.id)}>Send</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {/* Identity Modal */}
            {showIdentityModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                        <h2 className="text-xl font-bold mb-2">Identify Yourself</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">Please provide your details before adding feedback or approving the review.</p>

                        <form onSubmit={saveIdentity} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center">
                                    <User size={12} className="mr-1" /> Full Name
                                </label>
                                <input
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none"
                                    value={author.name}
                                    onChange={(e) => setAuthor({ ...author, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center">
                                    <Mail size={12} className="mr-1" /> Email Address
                                </label>
                                <input
                                    required
                                    type="email"
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none"
                                    value={author.email}
                                    onChange={(e) => setAuthor({ ...author, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="ghost" className="flex-1" onClick={() => setShowIdentityModal(false)}>Cancel</Button>
                                <Button variant="primary" className="flex-1" type="submit">Save Identity</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* PIN Protection Modal */}
            {pinRequired && (
                <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Secure Review</h2>
                        <p className="text-[var(--text-secondary)] mb-8 text-sm">
                            This review for <strong>{review?.project_name}</strong> is protected. Please enter the PIN code provided by your contact.
                        </p>

                        <form onSubmit={handleVerifyPin} className="space-y-4">
                            <input
                                type="text"
                                maxLength={6}
                                className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-xl border border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none"
                                placeholder="••••••"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                autoFocus
                            />
                            {pinError && <p className="text-[var(--danger)] text-xs font-bold">{pinError}</p>}
                            <Button variant="primary" className="w-full h-12" type="submit" disabled={pin.length < 4}>
                                Unlock Review
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicReviewPage;
