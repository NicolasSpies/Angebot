import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import {
    CheckCircle2, ShieldAlert, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    MessageSquare, MousePointer2, Hand, X, Layout, CircleDashed, History, Briefcase, Share2, Highlighter, Strikethrough
} from 'lucide-react';
import { dataService } from '../data/dataService';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import StatusPill from '../components/ui/StatusPill';
import ReviewSidebar from '../components/reviews/ReviewSidebar';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
    </div>
);

const ReviewPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Verification check (simulate internal access if we are within the app's main layout or via some auth check)
    // For this MVP, we can treat access via /review/:token as adaptive. 
    // If the path is nested under app shell (which it isn't anymore in routing), we'd know.
    // Instead, let's look for a 'mode' or check if we have internal user data.
    const isInternal = true;

    const [loading, setLoading] = useState(true);
    const [pdfError, setPdfError] = useState(null);
    const [review, setReview] = useState(null);
    const [currentVersion, setCurrentVersion] = useState(null);
    const [comments, setComments] = useState([]);
    const [pdf, setPdf] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.5);
    const [activeTool, setActiveTool] = useState('pin');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [annotations, setAnnotations] = useState([]);
    const [highlightedCommentId, setHighlightedCommentId] = useState(null);
    const [isDeleteCommentDialogOpen, setIsDeleteCommentDialogOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [pendingCommentPos, setPendingCommentPos] = useState(null);
    const [newCommentText, setNewCommentText] = useState('');
    const [highlightedPinId, setHighlightedPinId] = useState(null);

    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleDeleteCommentClick = (id) => {
        setCommentToDelete(id);
        setIsDeleteCommentDialogOpen(true);
    };

    const confirmDeleteComment = async () => {
        if (!commentToDelete) return;
        try {
            await dataService.deleteReviewComment(commentToDelete);
            toast.success('Comment deleted');
            loadData(token, currentVersion?.versionId);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            toast.error('Failed to delete comment');
        } finally {
            setIsDeleteCommentDialogOpen(false);
            setCommentToDelete(null);
        }
    };

    const loadData = useCallback(async (tokenToLoad, versionId = null, isSilent = false) => {
        if (!isSilent) setLoading(true);
        setPdfError(null);
        try {
            const data = await dataService.getReviewByToken(tokenToLoad, versionId);

            if (!data || data.error) {
                if (!isSilent) {
                    setPdfError(data?.error || 'Review not found.');
                    setLoading(false);
                }
                return;
            }

            setReview(data);
            setCurrentVersion(data);

            // Fetch comments separately if not included or for safety
            const commentsData = await dataService.getReviewComments(data.versionId);

            if (commentsData) {
                const mapped = Array.isArray(commentsData) ? commentsData.map(c => ({
                    id: c.id,
                    page: c.page_number,
                    type: c.type,
                    x: c.x,
                    y: c.y,
                    content: c.content,
                    author_name: c.author_name,
                    is_resolved: !!c.is_resolved,
                    created_at: c.created_at,
                    data: c.annotation_data ? JSON.parse(c.annotation_data) : null,
                })) : [];
                setAnnotations(mapped);
                setComments(mapped);
            }

            if (data.file_url) {
                const loadingTask = pdfjsLib.getDocument(data.file_url);
                const pdfDocument = await loadingTask.promise;
                setPdf(pdfDocument);
                setNumPages(pdfDocument.numPages);
                if (!isSilent) setCurrentPage(1);
            }
        } catch (err) {
            console.error('Failed to load review:', err);
            if (!isSilent) setPdfError('An unexpected error occurred.');
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            loadData(token);
            // Polling for real-time sync (every 5 seconds)
            const interval = setInterval(() => loadData(token, currentVersion?.versionId, true), 5000);
            return () => clearInterval(interval);
        }
    }, [token, loadData, currentVersion?.versionId]);

    const renderPage = useCallback(async (pageNum, currentScale) => {
        if (!pdf || !canvasRef.current || !overlayRef.current) return;
        if (renderTaskRef.current) renderTaskRef.current.cancel();

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentScale });

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const overlay = overlayRef.current;
            overlay.height = viewport.height;
            overlay.width = viewport.width;

            renderTaskRef.current = page.render({ canvasContext: context, viewport });
            await renderTaskRef.current.promise;

            drawAnnotations();
        } catch (err) {
            if (err.name !== 'RenderingCancelledException') console.error(err);
        }
    }, [pdf, annotations]);

    const drawAnnotations = useCallback(() => {
        if (!overlayRef.current) return;
        const ctx = overlayRef.current.getContext('2d');
        const { width, height } = overlayRef.current;
        ctx.clearRect(0, 0, width, height);

        const { width: drawWidth, height: drawHeight } = overlayRef.current;
        annotations.filter(ann => ann.page === currentPage).forEach(ann => {
            const isHighlighted = ann.id === highlightedPinId;

            if (ann.type === 'highlight' && ann.data) {
                ctx.fillStyle = isHighlighted ? 'rgba(255, 255, 0, 0.5)' : 'rgba(255, 255, 0, 0.3)';
                ctx.fillRect(
                    ann.data.x * drawWidth / 100,
                    ann.data.y * drawHeight / 100,
                    ann.data.width * drawWidth / 100,
                    ann.data.height * drawHeight / 100
                );
                if (isHighlighted) {
                    ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(
                        ann.data.x * drawWidth / 100,
                        ann.data.y * drawHeight / 100,
                        ann.data.width * drawWidth / 100,
                        ann.data.height * drawHeight / 100
                    );
                }
            } else if (ann.type === 'strike' && ann.data) {
                ctx.beginPath();
                ctx.strokeStyle = isHighlighted ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 0, 0, 0.6)';
                ctx.lineWidth = isHighlighted ? 3 : 2;
                const midY = (ann.data.y + ann.data.height / 2) * drawHeight / 100;
                ctx.moveTo(ann.data.x * drawWidth / 100, midY);
                ctx.lineTo((ann.data.x + ann.data.width) * drawWidth / 100, midY);
                ctx.stroke();
            }
        });
    }, [annotations, currentPage, highlightedPinId]);

    useEffect(() => {
        renderPage(currentPage, scale);
    }, [currentPage, scale, renderPage]);

    const handleMouseDown = (e) => {
        if (activeTool !== 'highlight' && activeTool !== 'strike') return;
        setIsDragging(true);
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDragStart({ x, y });
        setDragEnd({ x, y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || (activeTool !== 'highlight' && activeTool !== 'strike')) return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDragEnd({ x, y });

        const ctx = overlayRef.current.getContext('2d');
        const { width, height } = overlayRef.current;
        ctx.clearRect(0, 0, width, height);
        drawAnnotations();

        const xMin = Math.min(dragStart.x, x);
        const yMin = Math.min(dragStart.y, y);
        const xMax = Math.max(dragStart.x, x);
        const yMax = Math.max(dragStart.y, y);

        if (activeTool === 'highlight') {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.fillRect(xMin * width / 100, yMin * height / 100, (xMax - xMin) * width / 100, (yMax - yMin) * height / 100);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.strokeRect(xMin * width / 100, yMin * height / 100, (xMax - xMin) * width / 100, (yMax - yMin) * height / 100);
        } else if (activeTool === 'strike') {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.lineWidth = 2;
            const midY = (yMin + (yMax - yMin) / 2) * height / 100;
            ctx.moveTo(xMin * width / 100, midY);
            ctx.lineTo(xMax * width / 100, midY);
            ctx.stroke();
        }
    };

    const handleMouseUp = async () => {
        if (!isDragging) return;
        setIsDragging(false);

        const xMin = Math.min(dragStart.x, dragEnd.x);
        const yMin = Math.min(dragStart.y, dragEnd.y);
        const width = Math.max(dragStart.x, dragEnd.x) - xMin;
        const height = Math.max(dragStart.y, dragEnd.y) - yMin;

        if (width < 1 && height < 1) return;

        try {
            const res = await dataService.createReviewComment(currentVersion.versionId, {
                type: activeTool,
                annotation_data: JSON.stringify({ x: xMin, y: yMin, width, height }),
                page_number: currentPage,
                x: xMin,
                y: yMin,
                content: activeTool === 'highlight' ? 'Highlight' : 'Strike-through',
                author_name: 'Admin'
            });
            setAnnotations([...annotations, {
                id: res.id, page: currentPage, type: activeTool, data: { x: xMin, y: yMin, width, height }, x: xMin, y: yMin, content: activeTool === 'highlight' ? 'Highlight' : 'Strike-through'
            }]);
            setDragStart(null);
            setDragEnd(null);
        } catch (err) { }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const res = await dataService.uploadReview(review.project_id, file, review.title);
            if (res.error) {
                toast.error(res.error);
            } else {
                // Success - reload data for the new version
                await loadData(token);
                toast.success(`Version ${res.version_number} uploaded successfully!`);
            }
        } catch (err) {
            console.error('Upload failed:', err);
            toast.error('Upload failed. Check console.');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCanvasClick = async (e) => {
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Hit testing for Highlights and Strikes
        const hit = annotations.find(ann => {
            if (ann.page !== currentPage) return false;
            if (ann.type === 'highlight' || ann.type === 'strike') {
                const { x: ax, y: ay, width: aw, height: ah } = ann.data;
                return x >= ax && x <= ax + aw && y >= ay && y <= ay + ah;
            }
            return false;
        });

        if (hit) {
            const el = document.getElementById(`comment-${hit.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedCommentId(hit.id);
                setTimeout(() => setHighlightedCommentId(null), 3000);
            }
            return;
        }

        if (activeTool !== 'pin') return;

        setPendingCommentPos({ x, y });
        setIsCommentModalOpen(true);
    };

    const handleAddComment = async () => {
        if (!newCommentText.trim() || !pendingCommentPos) return;
        const { x, y } = pendingCommentPos;

        try {
            const res = await dataService.createReviewComment(currentVersion.versionId, {
                content: newCommentText,
                x,
                y,
                page_number: currentPage,
                type: 'comment',
                created_by: 'Designer' // Internal context
            });

            setAnnotations([...annotations, {
                id: res.id,
                type: 'comment',
                x,
                y,
                page: currentPage,
                content: newCommentText,
                author: 'Designer'
            }]);
            setNewCommentText('');
            setIsCommentModalOpen(false);
            setPendingCommentPos(null);
        } catch (err) {
            toast.error('Failed to add comment');
        }
    };
    if (loading) return <PageLoader />;
    if (pdfError) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)] p-6 text-center">
            <ShieldAlert size={48} className="text-red-500 mb-4" />
            <h3 className="text-lg font-bold">Review Unavailable</h3>
            <p className="text-[var(--text-secondary)]">{pdfError}</p>
            <Button onClick={() => navigate('/reviews')} className="mt-6">Back to Reviews</Button>
        </div>
    );

    const publicUrl = `${window.location.origin}/review/${review.token}`;

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-app)] overflow-hidden font-sans">
            <header className="h-16 border-b border-[var(--border-subtle)] bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/reviews')} className="p-2 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-secondary)] transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-[15px] text-[var(--text-main)] truncate max-w-[240px]">
                                {review.title || review.file_url?.split('/').pop()?.replace(/^comp-/, '') || 'Review PDF'}
                            </h1>
                            <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-app)] rounded-xl border border-[var(--border-subtle)] shadow-sm">
                                <History size={14} className="text-[var(--text-muted)]" />
                                <Select
                                    value={currentVersion.id}
                                    onChange={(e) => loadData(token, e.target.value)}
                                    options={review.allVersions?.map(v => ({
                                        value: v.id,
                                        label: `v${v.version_number}`
                                    }))}
                                    className="min-w-[50px]"
                                    triggerStyle={{
                                        height: '24px',
                                        paddingLeft: '0',
                                        paddingRight: '0',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        color: 'var(--text-secondary)'
                                    }}
                                />
                            </div>
                        </div>
                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                            {review.project_name}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-[var(--bg-app)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    <button
                        onClick={() => setActiveTool('pin')}
                        className={`p-1.5 rounded-lg transition-all ${activeTool === 'pin' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                        title="Comment Pin"
                    >
                        <MessageSquare size={16} />
                    </button>
                    <button
                        onClick={() => setActiveTool('highlight')}
                        className={`p-1.5 rounded-lg transition-all ${activeTool === 'highlight' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                        title="Highlight"
                    >
                        <Highlighter size={16} />
                    </button>
                    <button
                        onClick={() => setActiveTool('strike')}
                        className={`p-1.5 rounded-lg transition-all ${activeTool === 'strike' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}
                        title="Strike-through"
                    >
                        <Strikethrough size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest shadow-sm flex items-center gap-3 ${review.revisions_used >= review.review_limit ? 'bg-red-50 border-red-200 text-red-600' :
                        review.revisions_used >= review.review_limit * 0.6 ? 'bg-amber-50 border-amber-200 text-amber-600' :
                            'bg-emerald-50 border-emerald-200 text-emerald-600'
                        }`}>
                        <span className="opacity-60 text-[10px]">Revisions</span>
                        <div className="flex items-center gap-1.5 min-w-[32px] justify-center">
                            <span className="text-[14px]">{review.revisions_used || 0}</span>
                            <span className="opacity-40 text-[10px]">/</span>
                            <span className="text-[14px]">{review.review_limit || 3}</span>
                        </div>
                    </div>

                    <div className="w-px h-8 bg-[var(--border-subtle)] mx-1" />

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="application/pdf"
                        onChange={handleFileUpload}
                    />
                    {review.revisions_used < review.review_limit ? (
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="h-9 px-4 !bg-[var(--primary)] !text-white text-[12px] font-bold shadow-sm"
                        >
                            Upload v{(review.allVersions?.length || 1) + 1}
                        </Button>
                    ) : (
                        <div className="h-9 px-4 flex items-center gap-2 bg-red-50 text-red-600 text-[11px] font-bold border border-red-100 rounded-xl">
                            <ShieldAlert size={14} />
                            Limit Reached
                        </div>
                    )}

                    <div className="w-px h-8 bg-[var(--border-subtle)] mx-1" />

                    <a
                        href={`${review.file_url}?download=1`}
                        download
                        className="p-2.5 bg-white border border-[var(--border-subtle)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all shadow-sm"
                        title="Download PDF"
                    >
                        <Download size={18} />
                    </a>

                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-2 rounded-xl transition-all ${isSidebarOpen ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'}`}
                    >
                        <Layout size={18} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-auto bg-[var(--bg-app)] flex justify-center p-12 relative custom-scrollbar">
                    <div ref={containerRef} className={`relative bg-white shadow-2xl ${activeTool === 'pin' ? 'cursor-crosshair' : activeTool === 'draw' ? 'cursor-cell' : activeTool === 'pan' ? 'cursor-grab' : 'cursor-default'}`} style={{ height: 'fit-content' }}>
                        <canvas ref={canvasRef} className="block" />
                        <canvas
                            ref={overlayRef}
                            className="absolute top-0 left-0"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onClick={handleCanvasClick}
                        />
                        <div className="absolute inset-0 pointer-events-none">
                            {annotations.filter(c => c.page === currentPage && c.type === 'comment').map(comment => (
                                <div
                                    key={comment.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const el = document.getElementById(`comment-${comment.id}`);
                                        if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            setHighlightedCommentId(comment.id);
                                            setTimeout(() => setHighlightedCommentId(null), 3000);
                                        }
                                    }}
                                    className={`absolute w-8 h-8 -ml-4 -mt-4 text-white border-2 border-white rounded-full flex items-center justify-center shadow-lg pointer-events-auto cursor-pointer transition-all hover:scale-110 ${comment.is_resolved ? 'bg-slate-400' : 'bg-orange-500'} ${highlightedPinId === comment.id ? 'scale-125 ring-4 ring-orange-400 ring-offset-2 z-30' : ''}`}
                                    style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                                >
                                    <MessageSquare size={16} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-2xl px-6 py-2 rounded-2xl flex items-center gap-6 z-20 border border-gray-100">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></button>
                            <span className="text-xs font-bold w-12 text-center">{currentPage} / {numPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} /></button>
                        </div>
                        <div className="w-px h-6 bg-gray-200" />
                        <div className="flex items-center gap-4">
                            <ZoomOut size={16} className="cursor-pointer" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} />
                            <span className="text-xs font-bold w-10 text-center">{Math.round(scale * 100)}%</span>
                            <ZoomIn size={16} className="cursor-pointer" onClick={() => setScale(s => Math.min(3, s + 0.2))} />
                        </div>
                    </div>
                </main>
                {isSidebarOpen && (
                    <ReviewSidebar
                        comments={comments}
                        activeVersion={currentVersion}
                        highlightedCommentId={highlightedCommentId}
                        onCommentClick={(c) => {
                            setCurrentPage(c.page_number || 1);
                            setHighlightedPinId(c.id);
                            setTimeout(() => setHighlightedPinId(null), 3000);
                        }}
                        onResolveComment={handleDeleteCommentClick}
                    />
                )}
            </div>

            <ConfirmationDialog
                isOpen={isDeleteCommentDialogOpen}
                onClose={() => setIsDeleteCommentDialogOpen(false)}
                onConfirm={confirmDeleteComment}
                title="Delete Comment"
                message="Are you sure you want to delete this comment? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
            />

            {isCommentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold mb-4">Add Comment</h3>
                        <textarea
                            autoFocus
                            className="w-full h-32 p-4 bg-gray-50 border rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="Type your feedback here..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsCommentModalOpen(false);
                                    setNewCommentText('');
                                }}
                                className="px-5 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddComment}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200"
                            >
                                Add Comment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewPage;
