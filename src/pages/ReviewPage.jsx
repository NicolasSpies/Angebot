import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
    CheckCircle2, ShieldAlert, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    MessageSquare, MousePointer2, Hand, X, Layout, CircleDashed, History, Briefcase, Share2, Edit3
} from 'lucide-react';
import { dataService } from '../data/dataService';
import Button from '../components/ui/Button';
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
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [annotations, setAnnotations] = useState([]);

    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);

    const loadData = useCallback(async (tokenToLoad, versionId = null) => {
        setLoading(true);
        setPdfError(null);
        try {
            const data = await dataService.getReviewByToken(tokenToLoad, versionId);

            if (!data || data.error) {
                setPdfError(data?.error || 'Review not found.');
                setLoading(false);
                return;
            }

            setReview(data);
            setCurrentVersion(data);

            const commentData = await dataService.getReviewComments(data.versionId);
            setAnnotations(Array.isArray(commentData) ? commentData.map(c => ({
                id: c.id,
                page: c.page_number,
                type: c.type,
                x: c.x,
                y: c.y,
                data: c.annotation_data ? JSON.parse(c.annotation_data) : null,
                content: c.content
            })) : []);

            if (data.file_url) {
                const loadingTask = pdfjsLib.getDocument(data.file_url);
                const pdfDocument = await loadingTask.promise;
                setPdf(pdfDocument);
                setNumPages(pdfDocument.numPages);
                setCurrentPage(1);
            }
        } catch (err) {
            console.error('Failed to load review:', err);
            setPdfError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) loadData(token);
    }, [token, loadData]);

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

        annotations.filter(ann => ann.page === currentPage).forEach(ann => {
            const xPos = ann.x * width / 100;
            const yPos = ann.y * height / 100;

            if (ann.type === 'draw' && ann.data) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
                ctx.lineWidth = 2;
                ann.data.path.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x * width / 100, p.y * height / 100);
                    else ctx.lineTo(p.x * width / 100, p.y * height / 100);
                });
                ctx.stroke();
            } else if (ann.type === 'comment') {
                ctx.beginPath();
                ctx.arc(xPos, yPos, 8, 0, Math.PI * 2);
                ctx.fillStyle = ann.is_resolved ? '#94A3B8' : '#FB923C';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }, [annotations, currentPage]);

    useEffect(() => {
        renderPage(currentPage, scale);
    }, [currentPage, scale, renderPage]);

    const handleMouseDown = (e) => {
        if (activeTool !== 'draw') return;
        setIsDrawing(true);
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setCurrentPath([{ x, y }]);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || activeTool !== 'draw') return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setCurrentPath([...currentPath, { x, y }]);

        const ctx = overlayRef.current.getContext('2d');
        const { width, height } = overlayRef.current;
        ctx.clearRect(0, 0, width, height);
        drawAnnotations();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        currentPath.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x * width / 100, p.y * height / 100);
            else ctx.lineTo(p.x * width / 100, p.y * height / 100);
        });
        ctx.stroke();
    };

    const handleMouseUp = async () => {
        if (!isDrawing || activeTool !== 'draw') return;
        setIsDrawing(false);
        if (currentPath.length < 2) return;

        try {
            const res = await dataService.createReviewComment(currentVersion.versionId, {
                type: 'draw',
                annotation_data: JSON.stringify({ path: currentPath }),
                page_number: currentPage,
                x: currentPath[0].x,
                y: currentPath[0].y,
                content: 'Drawing',
                author_name: 'Admin'
            });
            setAnnotations([...annotations, {
                id: res.id, page: currentPage, type: 'draw', data: { path: currentPath }, x: currentPath[0].x, y: currentPath[0].y
            }]);
            setCurrentPath([]);
        } catch (err) { }
    };

    const handleCanvasClick = async (e) => {
        if (activeTool !== 'pin') return;
        const rect = overlayRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const content = prompt('Add a comment:');
        if (!content) return;

        try {
            const res = await dataService.createReviewComment(currentVersion.versionId, {
                content,
                x,
                y,
                page_number: currentPage,
                type: 'comment',
                created_by: 'Designer' // Internal context
            });

            setAnnotations([...annotations, {
                id: res.id,
                page: currentPage,
                type: 'comment',
                x,
                y,
                content,
                created_by: 'Designer'
            }]);
        } catch (err) {
            console.error('Save comment failed:', err);
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
                    <button onClick={() => navigate('/reviews')} className="p-2 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-secondary)] transition-colors"><ChevronLeft size={20} /></button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-bold text-[15px] text-[var(--text-main)] truncate max-w-[300px]">{review.project_name} - {review.title}</h1>
                            <div className="flex items-center gap-1.5 bg-[var(--bg-app)] rounded-lg border border-[var(--border-subtle)] h-[28px] px-2">
                                <History size={12} className="text-[var(--text-muted)]" />
                                <select
                                    value={currentVersion.versionId}
                                    onChange={(e) => loadData(token, e.target.value)}
                                    className="bg-transparent text-[11px] font-bold focus:outline-none"
                                >
                                    {review.allVersions?.map(v => (
                                        <option key={v.id} value={v.id}>v{v.version_number} {v.id === review.current_version_id ? '(Current)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <StatusPill status={review.status} />
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Designer Mode</span>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-muted)]">
                                Link: <code className="bg-gray-100 px-1 rounded">{review.token}</code>
                                <button onClick={() => { navigator.clipboard.writeText(publicUrl); alert('Copied!'); }} className="text-[var(--primary)] hover:underline">Copy Public URL</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-[var(--bg-app)] p-1 rounded-xl border border-[var(--border-subtle)] shadow-inner">
                    <button onClick={() => setActiveTool('select')} className={`p-2 rounded-lg ${activeTool === 'select' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`} title="Select"><MousePointer2 size={18} /></button>
                    <button onClick={() => setActiveTool('pan')} className={`p-2 rounded-lg ${activeTool === 'pan' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`} title="Pan"><Hand size={18} /></button>
                    <button onClick={() => setActiveTool('pin')} className={`p-2 rounded-lg ${activeTool === 'pin' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`} title="Pin Comment"><MessageSquare size={18} /></button>
                    <button onClick={() => setActiveTool('draw')} className={`p-2 rounded-lg ${activeTool === 'draw' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`} title="Freehand Draw"><Edit3 size={18} /></button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 mr-4">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Credits</span>
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <span className="text-xs font-bold text-[var(--text-main)]">{review.revisions_used} / {review.review_limit}</span>
                        </div>
                    </div>
                    <Button onClick={() => setIsUploadModalOpen(true)} className="btn-sm text-xs py-2">Upload v{review.allVersions.length + 1}</Button>
                    <div className="h-8 w-px bg-[var(--border-subtle)]" />
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2.5 rounded-xl ${isSidebarOpen ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-gray-100'}`}><Layout size={20} /></button>
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
                                <div key={comment.id} className="absolute w-8 h-8 -ml-4 -mt-4 bg-white text-[var(--primary)] border-2 border-[var(--primary)] rounded-full flex items-center justify-center shadow-lg pointer-events-auto cursor-pointer" style={{ left: `${comment.x}%`, top: `${comment.y}%` }}>
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
                        onCommentClick={(c) => setCurrentPage(c.page_number || 1)}
                        onResolveComment={(id) => setComments(comments.filter(c => c.id !== id))}
                    />
                )}
            </div>
        </div>
    );
};

export default ReviewPage;
