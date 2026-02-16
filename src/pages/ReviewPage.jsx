import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import {
    CheckCircle2, ShieldAlert, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    MessageSquare, MousePointer2, Hand, X, Layout, CircleDashed, History, Briefcase, Share2
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
    const isInternal = true; // TODO: Implement real auth check. 
    // Requirement 5: If logged in as internal user -> show version upload, force approve, etc.

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
    const [pinRequired, setPinRequired] = useState(false);
    const [pin, setPin] = useState('');

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const renderTaskRef = useRef(null);

    const loadData = useCallback(async (tokenToLoad, providedPin = null) => {
        setLoading(true);
        setPdfError(null);
        try {
            const data = await dataService.getReviewByToken(tokenToLoad, providedPin);

            if (data.pin_required) {
                setPinRequired(true);
                setReview({ project_name: data.project_name });
                setLoading(false);
                return;
            }

            if (!data || data.error) {
                setPdfError(data?.error || 'Review not found.');
                setLoading(false);
                return;
            }

            setReview(data);
            setCurrentVersion(data);
            setPinRequired(false);

            // Load Comments (Internal users see all, external see resolved? No, requirements say "Same viewer")
            const commentData = await dataService.getReviewComments(data.id);
            setComments(Array.isArray(commentData) ? commentData : []);

            // Load PDF
            if (data.file_url) {
                try {
                    const loadingTask = pdfjsLib.getDocument(data.file_url);
                    const pdfDocument = await loadingTask.promise;
                    setPdf(pdfDocument);
                    setNumPages(pdfDocument.numPages);
                    setCurrentPage(1);
                } catch (pdfErr) {
                    console.error('PDF.js loading failed:', pdfErr);
                    setPdfError('Failed to load PDF document.');
                }
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
        if (!pdf || !canvasRef.current) return;
        if (renderTaskRef.current) renderTaskRef.current.cancel();

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentScale });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = { canvasContext: context, viewport: viewport };

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

    const handleCanvasClick = async (e) => {
        if (activeTool !== 'pin' || !currentVersion) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const content = prompt('Add a comment:');
        if (!content) return;

        try {
            const newComment = await dataService.createReviewComment(currentVersion.id, {
                content,
                x,
                y,
                page_number: currentPage,
                author_name: isInternal ? 'Admin' : 'Client'
            });
            setComments([...comments, newComment]);
        } catch (err) {
            console.error('Failed to create comment:', err);
        }
    };

    const handleAction = async (action) => {
        if (!currentVersion?.review_id) return;
        try {
            const endpoint = action === 'approve' ? 'approve' : 'request-changes';
            // Unified post to handle actions by version ID if possible, or maintain existing
            const res = await fetch(`/api/reviews/${currentVersion.review_id}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionId: currentVersion.id })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Review ${action === 'approve' ? 'approved' : 'changes requested'}!`);
                loadData(token);
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error('Action failed:', err);
        }
    };

    if (loading) return <PageLoader />;

    if (pinRequired) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)] p-6 text-center">
                <div className="w-20 h-20 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center mb-8 shadow-sm">
                    <ShieldAlert size={40} />
                </div>
                <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Private Review</h1>
                <p className="text-[var(--text-secondary)] mb-6">Please enter the access code for <strong>{review?.project_name}</strong>.</p>
                <div className="flex gap-2 max-w-xs w-full mx-auto">
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Pin Code"
                        className="flex-1 p-3 bg-white border border-[var(--border-subtle)] rounded-xl outline-none focus:border-[var(--primary)] text-center tracking-[0.5em] font-bold"
                    />
                    <Button onClick={() => loadData(token, pin)}>Verify</Button>
                </div>
            </div>
        );
    }

    if (pdfError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)] p-6 text-center">
                <ShieldAlert size={48} className="text-red-500 mb-4" />
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Review Unavailable</h3>
                <p className="text-[var(--text-secondary)] max-w-sm">{pdfError}</p>
                <Button onClick={() => navigate('/reviews')} className="mt-6">Back to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-app)] overflow-hidden font-sans">
            <header className="h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between px-6 z-10 shadow-sm shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-secondary)] transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-bold text-[15px] text-[var(--text-main)] leading-none truncate max-w-[300px]">{review?.project_name} - {review?.title || 'Review'}</h1>
                            <div className="flex items-center gap-1.5 bg-[var(--bg-app)] rounded-lg border border-[var(--border-subtle)] h-[28px] px-2">
                                <History size={12} className="text-[var(--text-muted)]" />
                                <select
                                    value={token}
                                    onChange={(e) => navigate(`/review/${e.target.value}`)}
                                    className="bg-transparent text-[11px] font-bold text-[var(--text-main)] focus:outline-none"
                                >
                                    {review?.allVersions?.map(v => (
                                        <option key={v.id} value={v.token}>
                                            v{v.version_number} {v.id === review.current_version_id ? '(Current)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <StatusPill status={review?.review_container_status || review?.status} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{isInternal ? 'Internal Mode' : 'Guest View'}</span>
                            {isInternal && (
                                <>
                                    <div className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                                    <Link to={`/projects/${review?.project_id}`} className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1">
                                        <Briefcase size={10} /> Project Details
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-[var(--bg-app)] p-1 rounded-xl border border-[var(--border-subtle)] shadow-inner">
                    <button onClick={() => setActiveTool('select')} className={`p-2 rounded-lg ${activeTool === 'select' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}><MousePointer2 size={18} /></button>
                    <button onClick={() => setActiveTool('pan')} className={`p-2 rounded-lg ${activeTool === 'pan' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}><Hand size={18} /></button>
                    <button onClick={() => setActiveTool('pin')} className={`p-2 rounded-lg ${activeTool === 'pin' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}><MessageSquare size={18} /></button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <ZoomOut size={16} className="cursor-pointer" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} />
                        <span className="text-[13px] font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
                        <ZoomIn size={16} className="cursor-pointer" onClick={() => setScale(s => Math.min(3, s + 0.2))} />
                    </div>
                    <div className="flex items-center gap-2">
                        <ChevronLeft size={20} className="cursor-pointer" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                        <span className="text-[13px] font-bold">{currentPage} / {numPages}</span>
                        <ChevronRight size={20} className="cursor-pointer" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} />
                    </div>
                    <div className="h-8 w-px bg-[var(--border-subtle)]" />

                    <button onClick={() => handleAction('request-changes')} className="btn-secondary btn-sm">Request Changes</button>
                    <button onClick={() => handleAction('approve')} className="btn-primary btn-sm">Approve</button>

                    {isInternal && (
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Review link copied!');
                            }}
                            className="p-2.5 rounded-xl hover:bg-[var(--bg-app)] text-[var(--text-secondary)]"
                            title="Share Link"
                        >
                            <Share2 size={20} />
                        </button>
                    )}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2.5 rounded-xl ${isSidebarOpen ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                        <Layout size={20} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-auto bg-[var(--bg-app)] flex justify-center p-12 relative">
                    <div
                        ref={containerRef}
                        className={`relative bg-white shadow-2xl ${activeTool === 'pin' ? 'cursor-crosshair' : activeTool === 'pan' ? 'cursor-grab' : 'cursor-default'}`}
                        onClick={handleCanvasClick}
                        style={{ height: 'fit-content' }}
                    >
                        <canvas ref={canvasRef} className="block" />
                        <div className="absolute inset-0 pointer-events-none">
                            {comments.filter(c => c.page_number === currentPage).map(comment => (
                                <div
                                    key={comment.id}
                                    className="absolute w-8 h-8 -ml-4 -mt-4 bg-white text-[var(--primary)] border-2 border-[var(--primary)] rounded-full flex items-center justify-center shadow-lg pointer-events-auto cursor-pointer"
                                    style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                                >
                                    <MessageSquare size={16} />
                                </div>
                            ))}
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
